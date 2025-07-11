import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceSchool } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceSchool";
import type { IAttendanceClassroom } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceClassroom";
import type { IAttendanceStatsClassroomSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsClassroomSummary";

/**
 * 관리자 또는 교사 권한으로 교실 summary 레코드 삭제 정상 처리, 권한/존재이슈 검증
 *
 * 이 테스트는 관리자 또는 교사 권한으로 교실 출석 통계 요약(summary) 레코드를 정상적으로 삭제하면 status 204(Success)가 반환되고,
 * 이미 삭제된 레코드에 대한 재삭제/존재하지 않는 ID에 대한 삭제 요청은 404(Not Found)를 발생시키는지 검증합니다.
 *
 * 또한, 권한 없는 사용자의 접근(삭제) 시 403(Forbidden)이 발생하는 조건 검증까지 시나리오에 포함합니다(권한 에러 시도는 현재
 * connection context에서 별도의 권한 수준 계정이 제공되지 않으므로 business comment로 처리).
 *
 * 주요 단계:
 * 1. 학교(school) 생성 (데이터 무결성 보장)
 * 2. 교실(classroom) 생성 (teacher_id는 임의 uuid)
 * 3. summary 레코드 생성
 * 4. summary 정상 삭제 (204)
 * 5. 삭제된 summary 재삭제/존재하지 않는 ID 삭제: 404 검증
 * 6. 권한없는 사용자 403 오류 시나리오 (비즈니스 코멘트)
 */
export async function test_api_attendance_test_delete_classroom_summary_success_forbidden_and_not_found(connection: api.IConnection) {
  // 1. 학교(school) 생성
  const school = await api.functional.attendance.schools.post(connection, {
    body: {
      name: RandomGenerator.name(),
      address: RandomGenerator.paragraph()(),
    } satisfies IAttendanceSchool.ICreate,
  });
  typia.assert(school);

  // 2. 교실(classroom) 생성 (teacher_id는 임의 uuid)
  const teacher_id: string = typia.random<string & tags.Format<"uuid">>();
  const classroom = await api.functional.attendance.classrooms.post(connection, {
    body: {
      school_id: school.id,
      teacher_id,
      name: "1-1",
      grade_level: 1,
    } satisfies IAttendanceClassroom.ICreate,
  });
  typia.assert(classroom);

  // 3. summary 레코드 생성
  const summary = await api.functional.attendance.stats.classroomSummaries.post(connection, {
    body: {
      classroom_id: classroom.id,
      school_id: school.id,
      period_start: "2025-03-01",
      period_end: "2025-03-31",
      total_present: 21,
      total_late: 0,
      total_absent: 0,
      total_early_leave: 0,
    } satisfies IAttendanceStatsClassroomSummary.ICreate,
  });
  typia.assert(summary);

  // 4. summary 정상 삭제 (204 success)
  await api.functional.attendance.stats.classroomSummaries.eraseById(connection, {
    id: summary.id,
  });

  // 5. 삭제된 summary 재삭제 시 404(Not Found) 반환 검증
  await TestValidator.error("404 when deleting already deleted record")(
    async () =>
      api.functional.attendance.stats.classroomSummaries.eraseById(connection, {
        id: summary.id,
      }),
  );

  // 6. 존재하지 않는 임의 UUID로 삭제 요청 시도: 404 검증
  await TestValidator.error("404 when deleting non-existent record")(
    async () =>
      api.functional.attendance.stats.classroomSummaries.eraseById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      }),
  );

  // 7. 권한없는 사용자 (비즈니스 코멘트: 실제 다른 권한 connection으로 테스트 필요)
  // 실제 권한 제어 E2E는 별도 사용자인증/권한connection 주입시 구현 가능함
}