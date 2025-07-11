import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 이미 등록된 이메일로 인증 계정 재생성 시 409 Conflict를 검증하는 테스트
 *
 * 이 테스트는 /attendance/auth/accounts 엔드포인트를 이용해 정상 계정을 먼저 등록한 뒤,
 * 동일한 이메일로 한 번 더 등록을 시도하면 중복 이메일로 인한 409 에러가 발생하는지 확인합니다.
 *
 * [테스트 절차]
 * 1. typia.random으로 이메일/비밀번호를 생성해 계정 생성 API(post)를 정상 호출합니다.
 * 2. 첫 번째 응답이 정상(IAttendanceAuthAccount 타입)임을 typia.assert로 확인합니다.
 * 3. 동일한 이메일/비밀번호 조합으로 계정 등록을 다시 시도합니다.
 * 4. 두 번째 호출에서 중복으로 인한 런타임 예외(409)가 발생하는지 TestValidator.error로 테스트합니다.
 *    (에러 내용/메시지는 검증하지 않음)
 */
export async function test_api_attendance_test_create_auth_account_with_duplicate_email(
  connection: api.IConnection,
) {
  // 1. 이메일/비밀번호 랜덤 생성
  const email = typia.random<string & tags.Format<"email">>();
  const password_hash = typia.random<string>();

  // 2. 첫 번째 등록 성공: 정상 계정 생성
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email,
      password_hash,
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account);

  // 3. 동일 이메일/비밀번호로 한 번 더 등록 시도 → 중복 에러 확인
  await TestValidator.error("동일 이메일 중복시 409 오류")(async () => {
    await api.functional.attendance.auth.accounts.post(connection, {
      body: {
        email,
        password_hash,
      } satisfies IAttendanceAuthAccount.ICreate,
    });
  });
}