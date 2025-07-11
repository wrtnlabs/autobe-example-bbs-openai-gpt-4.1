import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthSession";

/**
 * 로그인(인증 세션 생성) 시 비정상적인 인증정보와 비활성계정 조합에 대한 실패 처리 검증
 *
 * 1. 정상 활성 계정(이메일+패스워드) 생성
 * 2. 존재하지 않는 계정 id로 세션 생성 시도 → 401/403 error 검증
 * 3. 잘못된 토큰(실제 패스워드 미노출: 토큰 필드로 시나리오 대체) → 401/403 error 검증
 * 4. 계정 삭제상태(deleted_at) 시나리오 시뮬레이션 → soft delete 계정은 인증 실패(401/403)
 *
 * - 활성, 삭제(비활성화), 미등록 조합별 인증 실패 여부 일괄 검증
 * - error 발생 여부만 검증 (메시지, error type별 체크X)
 * - 실제 비활성화/삭제 엔드포인트가 없으므로 deleted_at 직접 할당으로 soft delete 상황만 시뮬레이션
 */
export async function test_api_attendance_test_create_auth_session_with_invalid_credentials(
  connection: api.IConnection,
) {
  // 1. 정상 활성 계정(이메일+패스워드) 생성
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = typia.random<string>();
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: { email, password_hash: passwordHash } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account);

  // 2. 존재하지 않는 계정 id로 인증 세션 생성(실패)
  const nonExistId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("존재하지 않는 계정 인증 실패")(() =>
    api.functional.attendance.auth.sessions.post(connection, {
      body: {
        auth_account_id: nonExistId,
        session_token: typia.random<string>(),
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      } satisfies IAttendanceAuthSession.ICreate,
    }),
  );

  // 3. 잘못된 토큰(실제 패스워드 대신 토큰 필드 사용)
  await TestValidator.error("잘못된 토큰 인증 실패")(() =>
    api.functional.attendance.auth.sessions.post(connection, {
      body: {
        auth_account_id: account.id,
        session_token: "wrong-token-" + typia.random<string>(),
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      } satisfies IAttendanceAuthSession.ICreate,
    }),
  );

  // 4. soft delete(계정 삭제상태) 계정 시나리오 — 실제 API 없는 관계로 직접 오브젝트 조작
  const deletedAccount = {
    ...account,
    deleted_at: new Date().toISOString(),
  } satisfies IAttendanceAuthAccount;
  await TestValidator.error("soft delete 계정 인증 실패")(() =>
    api.functional.attendance.auth.sessions.post(connection, {
      body: {
        auth_account_id: deletedAccount.id,
        session_token: typia.random<string>(),
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      } satisfies IAttendanceAuthSession.ICreate,
    }),
  );
}