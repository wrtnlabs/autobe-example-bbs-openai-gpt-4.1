import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 인증계정 비밀번호 변경 성공 테스트
 *
 * 사용자/관리자가 자신의 패스워드 변경을 정상적으로 요청할 때,
 * 비밀번호가 성공적으로 변경되고 응답 객체가 반환되는지 검증합니다.
 * (실제 새 비밀번호로 인증 등의 로직은 별도 테스트에서 진행)
 *
 * 1. 테스트용 인증계정을 생성합니다 (POST /attendance/auth/accounts)
 * 2. 인증계정의 비밀번호를 새로운 해시값으로 변경 요청합니다 (PUT /attendance/auth/accounts/{id})
 * 3. 응답 결과에 변경된 사항이 반영됐는지 확인합니다
 */
export async function test_api_attendance_auth_account_test_update_auth_account_change_password_success(
  connection: api.IConnection,
) {
  // 1. 테스트용 인증계정 생성
  const email: string & tags.Format<"email"> = typia.random<string & tags.Format<"email">>();
  const password_hash1: string = typia.random<string>();
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email,
      password_hash: password_hash1,
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account);
  TestValidator.equals("이메일 일치")(account.email)(email);
  TestValidator.equals("패스워드 해시 일치")(account.password_hash)(password_hash1);

  // 2. 비밀번호 변경 요청 (PUT)
  const password_hash2: string = typia.random<string>();
  const updated = await api.functional.attendance.auth.accounts.putById(connection, {
    id: account.id,
    body: {
      password_hash: password_hash2,
    } satisfies IAttendanceAuthAccount.IUpdate,
  });
  typia.assert(updated);

  // 3. 비밀번호 해시 변경 확인 (이메일은 유지되고 패스워드만 바뀜)
  TestValidator.equals("이메일 유지됨")(updated.email)(account.email);
  TestValidator.equals("패스워드 해시 변경됨")(updated.password_hash)(password_hash2);
}