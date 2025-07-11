import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceStatsClassroomSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsClassroomSummary";

/**
 * 출석 통계 교실 요약 신규 생성 및 중복 및 validation 에러 E2E 테스트
 *
 * 이 테스트는 관리자가 정상 입력(교실, 학교, 기간, 집계 필드)으로 출석 통계 요약을 신규 생성할 수 있는지 검증한다. 
 * - 반환값 필드(FK, 기간, 집계 numeric 등) 매핑 및 타입 일치, FK 유효성 포함
 * - 동일 교실/기간 조합 중복 요청시 정책상 에러(409 등) 반환 검증
 * - 필수값 누락이나 음수/이상 값 등 validation 에러(422) 상황 검증
 *
 * 테스트 절차(시나리오):
 * 1. 테스트용 학교 데이터를 등록한다.
 * 2. 임의 teacher_id로 교실 데이터를 등록한다.
 * 3. 정상 입력값으로 출석 통계 요약을 생성한다(모든 필드 명시적으로 지정).
 * 4. 반환 데이터 필드 각각이 입력값/선행 참조값과 정확히 일치하는지 검증한다.
 * 5. 동일 교실/기간 조합으로 중복 생성 재시도시 409(혹은 정책상 에러) 발생하는지 검증한다.
 * 6. 필수값 누락 등 invalid 입력, 음수 입력시에 422 validation 에러가 정상 발생하는지 검사한다.
 */
export async function test_api_attendance_test_create_classroom_summary_with_valid_and_duplicate_data(
  connection: api.IConnection,
) {
  // 1. 테스트용 학교 등록
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: `${RandomGenerator.name()}초등학교`,
      address: RandomGenerator.paragraph()(),
    },
  });
  typia.assert(school);

  // 2. 임의 teacher_id로 교실 등록
  const teacherId = typia.random<string & tags.Format<"uuid">>();
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: teacherId,
      name: "1-1",
      grade_level: 1,
    },
  });
  typia.assert(classroom);

  // 3. 정상 입력 출석 통계 요약 생성
  const period_start = "2025-03-01";
  const period_end = "2025-03-31";
  const statInput = {
    classroom_id: classroom.id,
    school_id: school.id,
    period_start,
    period_end,
    total_present: 23,
    total_late: 2,
    total_absent: 1,
    total_early_leave: 0,
  } as const;
  const summary = await api.functional.attendance.stats.classroomSummaries.post(
    connection,
    { body: statInput },
  );
  typia.assert(summary);

  // 4. 반환값 FK 및 입력값 일치 검증
  TestValidator.equals("classroom_id 일치")(summary.classroom_id)(classroom.id);
  TestValidator.equals("school_id 일치")(summary.school_id)(school.id);
  TestValidator.equals("기간 정보 일치")(summary.period_start)(period_start);
  TestValidator.equals("기간 정보 일치")(summary.period_end)(period_end);
  TestValidator.equals("출석 합계")(summary.total_present)(statInput.total_present);
  TestValidator.equals("지각 합계")(summary.total_late)(statInput.total_late);
  TestValidator.equals("결석 합계")(summary.total_absent)(statInput.total_absent);
  TestValidator.equals("조퇴 합계")(summary.total_early_leave)(statInput.total_early_leave);

  // 5. 동일 교실/기간 중복 생성 시도 - 409 혹은 정책상 에러 발생
  await TestValidator.error("동일 교실/기간 중복 생성 시 에러")(async () => {
    await api.functional.attendance.stats.classroomSummaries.post(
      connection,
      { body: statInput },
    );
  });

  // 6-1. 필수값 누락 (예: period_start 빠짐)
  await TestValidator.error("필수값 누락시 validation 에러")(async () => {
    const { period_start, ...incomplete } = statInput;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await api.functional.attendance.stats.classroomSummaries.post(connection, {
      body: incomplete as any, // 타입 시스템상 omit은 강제 우회 필요 (실제 런타임 validation 에러만 체크)
    });
  });

  // 6-2. 이상치(음수) 입력 validation 에러
  await TestValidator.error("음수값 입력시 validation 에러")(async () => {
    await api.functional.attendance.stats.classroomSummaries.post(connection, {
      body: {
        ...statInput,
        total_present: -1,
      },
    });
  });
}