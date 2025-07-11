import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceStatsClassroomSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsClassroomSummary";

/**
 * 출석 통계 요약(반/학급+기간별) 정보 레코드 수정 E2E 테스트
 *
 * - 관리자 또는 교사가 기존 summary 레코드의 출석 카운트/기간 등 필드를 정상 값으로 수정
 * - 모든 필드(기간, 출석/지각/결석/조퇴 수치)가 반영되는지 확인
 * - 동일 교실+기간 값으로 수정 시 unique constraint 위반으로 409 충돌 발생 확인
 * - 존재하지 않는 id/잘못된 값으로 404/422 오류 발생 검증
 * - 권한 없는 사용자가 수정 시도 시 403 발생 검증(단, 현재 인증 제어 API 없음)
 *
 * 절차:
 * 1. (사전) 학교, 교실, 통계 summary 레코드 생성
 * 2. 모든 필드를 새 값으로 정상 수정, 결과 반영값 일치 검증
 * 3. unique 위반(동일 교실/period 조합 중복) 수정 시도, 409 발생 확인
 * 4. 없는 summary id로 수정 시 404 발생 확인
 * 5. 입력 오류(필수 필드 누락 등) 시 422 발생 확인 (컴파일 타임 오류 제외)
 * 6. 권한 없는 사용자가 수정 시도 시 403 발생 검증(단, 인증 엔드포인트 미제공으로 생략)
 */
export async function test_api_attendance_test_update_classroom_summary_valid_duplicate_violation_and_permission(
  connection: api.IConnection,
) {
  // 1. (사전 세팅) 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.alphabets(8),
      address: RandomGenerator.paragraph()(2),
    },
  });
  typia.assert(school);
  
  // 임시 teacher UUID 생성 (실제 사용자 인증/생성 API 없음)
  const teacher_id = typia.random<string & tags.Format<"uuid">>();

  // 2. 교실 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id,
      name: RandomGenerator.alphabets(4),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    },
  });
  typia.assert(classroom);

  // 3. summary(출석 통계요약) 레코드1 생성
  const period_start = "2025-03-01";
  const period_end = "2025-03-31";
  const summary = await api.functional.attendance.stats.classroomSummaries.post(connection, {
    body: {
      classroom_id: classroom.id,
      school_id: school.id,
      period_start,
      period_end,
      total_present: 20,
      total_late: 2,
      total_absent: 1,
      total_early_leave: 0,
    },
  });
  typia.assert(summary);

  // 4. summary 레코드2(unique test용, 동일 classroom_id + 겹치는 period 사용) 생성
  const summary2 = await api.functional.attendance.stats.classroomSummaries.post(connection, {
    body: {
      classroom_id: classroom.id,
      school_id: school.id,
      period_start: "2025-04-01",
      period_end: "2025-04-30",
      total_present: 18,
      total_late: 0,
      total_absent: 2,
      total_early_leave: 1,
    },
  });
  typia.assert(summary2);

  // 5. 전체 필드 정상 수정 (PUT)
  const update_input = {
    period_start: "2025-03-05",
    period_end: "2025-03-29",
    total_present: 15,
    total_late: 1,
    total_absent: 2,
    total_early_leave: 0,
  } satisfies IAttendanceStatsClassroomSummary.IUpdate;
  const updated = await api.functional.attendance.stats.classroomSummaries.putById(connection, {
    id: summary.id,
    body: update_input,
  });
  typia.assert(updated);
  // 값 일치 검증
  TestValidator.equals("수정 결과 전체 필드 일치")({
    period_start: updated.period_start,
    period_end: updated.period_end,
    total_present: updated.total_present,
    total_late: updated.total_late,
    total_absent: updated.total_absent,
    total_early_leave: updated.total_early_leave,
  })(update_input);

  // 6. unique 위반(다른 레코드와 동일 classroom_id + period값) → 409
  TestValidator.error("summary unique 제약 위반 409")(() =>
    api.functional.attendance.stats.classroomSummaries.putById(connection, {
      id: summary.id,
      body: {
        period_start: summary2.period_start,
        period_end: summary2.period_end,
        total_present: 11,
        total_late: 0,
        total_absent: 1,
        total_early_leave: 1,
      },
    })
  );

  // 7. 없는 summary id로 수정 → 404
  TestValidator.error("존재하지 않는 id로 수정시 404")(() =>
    api.functional.attendance.stats.classroomSummaries.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: {
        period_start: "2025-05-01",
        period_end: "2025-05-31",
        total_present: 10,
        total_late: 0,
        total_absent: 2,
        total_early_leave: 0,
      },
    })
  );

  // 8. 잘못된 입력(음수 등) → 422
  TestValidator.error("잘못된 입력값 422")(() =>
    api.functional.attendance.stats.classroomSummaries.putById(connection, {
      id: summary.id,
      body: {
        period_start: "2025-07-01",
        period_end: "2025-07-31",
        total_present: -1, // 음수(유효성 위반)
        total_late: 0,
        total_absent: 0,
        total_early_leave: 0,
      },
    })
  );

  // 9. (권한 없는 사용자 시도 케이스: 실제 인증·권한 API 제공 없음 → 생략)
}