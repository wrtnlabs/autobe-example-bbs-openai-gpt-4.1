import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthSession";

/**
 * 세션(토큰) 삭제(로그아웃) 성공 - DELETE /attendance/auth/sessions/{id}
 *
 * - 실제 로그인(세션 발급) 후, 세션ID로 세션 삭제(토큰 폐기/로그아웃) 요청이 정상처리 되는지 검증한다.
 * - 세션 삭제 성공: 204 또는 200(응답 본문없음)
 * - 삭제된 세션의 재사용 불가: 해당 토큰/세션으로의 추가 사용/인증 거부되어야 하나, 추가 인증체크 API가 없으므로 여기는 생략.
 *
 * ## 절차
 * 1. 임의 랜덤 이메일·비밀번호 조합의 인증계정 생성
 * 2. 위 계정으로 인증세션(로그인) 발급/연결
 * 3. 발급된 세션 특정 ID로 DELETE 요청 (정상 로그아웃/토큰 폐기)
 * 4. (추가적 인증체크 API 부재로, 세션 재사용거부 검증은 생략)
 */
export async function test_api_attendance_auth_sessions_test_delete_auth_session_token_logout_success(
  connection: api.IConnection,
) {
  // 1. 임의 랜덤 이메일·비밀번호 조합의 인증계정 생성
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string>();
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email,
      password_hash: password,
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account);

  // 2. 위 계정으로 인증세션(로그인) 발급/연결
  const session_token = typia.random<string>();
  const issued_at = new Date().toISOString();
  const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString();
  const session = await api.functional.attendance.auth.sessions.post(connection, {
    body: {
      auth_account_id: account.id,
      session_token,
      issued_at,
      expires_at,
      user_agent: "E2E TEST UA",
      ip_address: "127.0.0.1",
    } satisfies IAttendanceAuthSession.ICreate,
  });
  typia.assert(session);

  // 3. 발급된 세션 특정 ID로 DELETE 요청 (정상 로그아웃/토큰 폐기)
  await api.functional.attendance.auth.sessions.eraseById(connection, {
    id: session.id,
  });

  // 4. (추가적 인증체크 API 부재로, 세션 재사용거부 검증은 생략)
}