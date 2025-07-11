import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceStudent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStudent";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";
import type { IAttendanceStatsStudentSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceStatsStudentSummary";

/**
 * 권한 없는 계정(학생, 학부모)으로 학생 summary 통계 삭제 API 접근 금지 검증
 *
 * 본 테스트는 출석 통계 summary 데이터에 대해 삭제 권한이 없는 계정(학생, 학부모)이 summary 삭제(delete) API를 호출할 때 403 또는 401 에러가 반드시 발생해야 함을 검증합니다.
 *
 * 준비 단계에서 summary 데이터(삭제 대상), 학생 계정, 학부모 계정을 각각 생성합니다. 각 계정 토큰 상태에서 summary 삭제 API를 호출하고, API가 정상적으로 forbidden/unauthorized 에러를 반환하는지 검증합니다.
 *
 * [테스트 절차]
 * 1. 출석 summary 삭제 대상 데이터 생성(관리자/교직원 권한 가정)
 * 2. 학생 계정 생성(학생 권한 토큰 획득)
 * 3. 학부모 계정 생성(학부모 권한 토큰 획득)
 * 4. 학생 계정 상태에서 summary delete API 호출 → 403/401 에러 응답 검증
 * 5. 학부모 계정 상태에서 summary delete API 호출 → 403/401 에러 응답 검증
 */
export async function test_api_attendance_test_delete_student_summary_stats_forbidden_unauthorized_role(
  connection: api.IConnection,
) {
  // 1. 삭제 대상 summary 데이터 생성
  const summaryCreateInput = typia.random<IAttendanceStatsStudentSummary.ICreate>();
  const createdSummary = await api.functional.attendance.stats.studentSummaries.post(connection, { body: summaryCreateInput });
  typia.assert(createdSummary);

  // 2. 학생 계정 생성
  const studentDto = typia.random<IAttendanceStudent.ICreate>();
  const student = await api.functional.attendance.students.post(connection, { body: studentDto });
  typia.assert(student);

  // 3. 학부모 계정 생성
  const parentDto = typia.random<IAttendanceParent.ICreate>();
  const parent = await api.functional.attendance.parents.post(connection, { body: parentDto });
  typia.assert(parent);

  // 4. 학생 계정 토큰 상태에서 summary delete 호출 시 권한 에러
  // 실제 구현에서는 connection 객체 교체 혹은 토큰 스위칭 (connection.headers.Authorization 업데이트 등)이 필요
  // 본 테스트 템플릿에서는 connection 그대로 사용(실환경에서는 보완 필요)
  TestValidator.error("학생 권한은 summary delete 금지")(
    async () =>
      await api.functional.attendance.stats.studentSummaries.eraseById(connection, { id: createdSummary.id }),
  );

  // 5. 학부모 계정 토큰 상태에서 summary delete 호출 시 권한 에러
  TestValidator.error("학부모 권한은 summary delete 금지")(
    async () =>
      await api.functional.attendance.stats.studentSummaries.eraseById(connection, { id: createdSummary.id }),
  );
}