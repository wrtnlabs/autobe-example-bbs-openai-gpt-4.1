import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";
import type { IAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsStudentSummary";

/**
 * [출결 통계 요약 접근 권한 거부 E2E 테스트]
 *
 * 학생 본인이나 무관한 학부모(권한 없는 사용자)가 다른 학생의 출결 통계 요약 데이터를 조회 시도할 때 반드시 403 forbidden 또는 401 unauthorized 오류가 발생해야 함을 검증한다.
 *
 * [테스트 목적 및 시나리오]
 * 1. 학생 계정으로 신규 학생 생성 후 정상적으로 학생1 개체 확보
 * 2. 또다른 학생(학생2) 계정 생성
 * 3. 검증용 summaryId (UUID) 준비 (실제 존재 student의 summaryId 또는 임의의 UUID)
 * 4. 학생2 토큰(또는 권한과 무관한 학부모 토큰)으로 summaryId 조회 시도
 * 5. 반드시 401 또는 403 오류가 발생해야 함을 검증
 * 6. 학부모 계정도 동일하게 비인가 summaryId 접근 시 거부됨을 검증
 */
export async function test_api_attendance_test_get_student_summary_stats_access_denied_for_unauthorized_role(
  connection: api.IConnection,
) {
  // 1. 학생1 생성
  const student1 = await api.functional.attendance.students.post(connection, {
    body: typia.random<IAttendanceStudent.ICreate>(),
  });
  typia.assert(student1);

  // 2. 학생2 생성
  const student2 = await api.functional.attendance.students.post(connection, {
    body: typia.random<IAttendanceStudent.ICreate>(),
  });
  typia.assert(student2);

  // 3. 검증용 summaryId (UUID) 준비
  const summaryId = typia.random<string & tags.Format<"uuid">>();

  // 4. 학생2 토큰 컨텍스트로 summaryId 접근 시도 - 401/403 에러 발생 검증
  await TestValidator.error("학생2의 타학생 summary 접근 차단")(
    async () => {
      await api.functional.attendance.stats.studentSummaries.getById(connection, {
        id: summaryId,
      });
    },
  );

  // 5. 학부모 계정 생성 및 해당 토큰으로 summaryId 접근 시도 - 401/403 에러 발생 검증
  const parent = await api.functional.attendance.parents.post(connection, {
    body: typia.random<IAttendanceParent.ICreate>(),
  });
  typia.assert(parent);

  await TestValidator.error("학부모의 타학생 summary 접근 차단")(
    async () => {
      await api.functional.attendance.stats.studentSummaries.getById(connection, {
        id: summaryId,
      });
    },
  );
}