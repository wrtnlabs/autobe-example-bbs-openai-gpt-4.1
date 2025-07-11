import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 관리자 권한으로 인증계정(AttendanceAuthAccount)의 소프트 삭제(soft-delete) 기능을 검증합니다.
 *
 * 1. 테스트용 인증 계정을 신규 생성합니다.
 * 2. (관리자 권한을 가정하여) 대상 계정의 소프트 삭제 API를 실행합니다.
 * 3. 삭제 응답 데이터에서 deleted_at 필드가 null이 아님(즉, 삭제 시각이 기록됨)을 확인합니다.
 * 4. 삭제 API 정상 동작 이후 반환된 객체에서 deleted_at, id, email 등 주요 필드 값이 보존되는지 검증합니다.
 */
export async function test_api_attendance_auth_account_test_delete_auth_account_success_by_admin(
  connection: api.IConnection,
) {
  // 1. 테스트용 인증 계정 생성
  const created: IAttendanceAuthAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(12),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(created);

  // 2. 관리자 권한으로 소프트 삭제 API 호출
  const deleted: IAttendanceAuthAccount = await api.functional.attendance.auth.accounts.eraseById(connection, {
    id: created.id,
  });
  typia.assert(deleted);

  // 3. 삭제 결과 검증 - deleted_at이 null이 아님
  TestValidator.predicate("deleted_at이 null이 아님")(deleted.deleted_at !== null && deleted.deleted_at !== undefined);
  // 4. id, email 등 주요 필드 값 보존 검증
  TestValidator.equals("id 값 일치")(deleted.id)(created.id);
  TestValidator.equals("email 데이터 일치")(deleted.email)(created.email);
}