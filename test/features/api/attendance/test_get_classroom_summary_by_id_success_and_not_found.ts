import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceStatsClassroomSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsClassroomSummary";

/**
 * 교실 통계 요약 상세조회(GET) 성공/실패 테스트
 *
 * 1. 테스트용 학교 생성
 * 2. 테스트 교실 생성(해당 학교 FK)
 * 3. summary 데이터 생성(해당 교실+학교 FK)
 * 4. summary.id로 상세조회 성공(모든 요약값 필드 비교)
 * 5. 존재하지 않는 id로 조회 시 404(에러) 반환 확인
 */
export async function test_api_attendance_test_get_classroom_summary_by_id_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. 테스트용 학교 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 2. 테스트 교실 생성
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(),
      grade_level: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 3. summary 데이터 생성 (해당 교실/학교 FK)
  const period_start = "2025-03-01";
  const period_end = "2025-03-31";
  const summary = await api.functional.attendance.stats.classroomSummaries.post(connection, {
    body: {
      classroom_id: classroom.id,
      school_id: school.id,
      period_start: period_start,
      period_end: period_end,
      total_present: 20,
      total_late: 2,
      total_absent: 1,
      total_early_leave: 0,
    } satisfies IAttendanceStatsClassroomSummary.ICreate,
  });
  typia.assert(summary);

  // 4. summary.id로 상세조회(정확한 값 반환)
  const result = await api.functional.attendance.stats.classroomSummaries.getById(connection, {
    id: summary.id,
  });
  typia.assert(result);
  TestValidator.equals("classroom_id 일치")(result.classroom_id)(classroom.id);
  TestValidator.equals("school_id 일치")(result.school_id)(school.id);
  TestValidator.equals("기간시작")(result.period_start)(period_start);
  TestValidator.equals("기간종료")(result.period_end)(period_end);
  TestValidator.equals("출석합")(result.total_present)(20);
  TestValidator.equals("지각합")(result.total_late)(2);
  TestValidator.equals("결석합")(result.total_absent)(1);
  TestValidator.equals("조퇴합")(result.total_early_leave)(0);

  // 5. 존재하지 않는 id로 조회 시 404(에러) 반환 확인
  await TestValidator.error("없는 summary id 조회시 404 반환")(() =>
    api.functional.attendance.stats.classroomSummaries.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    })
  );
}