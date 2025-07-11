import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthSession";

/**
 * 인증 세션 생성 성공 및 중복 로그인 시 세션 고유성 검증
 *
 * 사전 준비로 임의의 이메일·비밀번호 해시를 가진 인증 계정을 생성하고,
 * 해당 계정으로 세션 생성(로그인) 요청 시 신규 세션 정보(토큰, 만료 시각 등)가
 * 정확하게 반환되는지 확인한다. 이어 동일 계정으로 토큰을 다르게 하여 다시
 * 로그인(중복 세션 생성) 할 경우, 별도의 세션이 정상적으로 추가 발급되고 두 세션의
 * 주요 정보(id, 토큰, 만료시각 등)가 모두 상이한지 검사한다.
 * 
 * 주요 점검 포인트:
 * 1. 임의의 이메일·패스워드로 인증 계정 신규 생성
 * 2. 최초 세션(로그인) 발급 및 정보 검증(typia.assert, TestValidator)
 * 3. 동일 계정 - 다른 토큰으로 중복 로그인 시 별도 세션 추가 발급 및 쌍방 비교 검증
 */
export async function test_api_attendance_auth_sessions_test_create_auth_session_successful_login(
  connection: api.IConnection,
) {
  // 1. 임의의 인증 계정(이메일/패스워드 해시) 생성
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(32); // 해시로 가정
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: email,
      password_hash: passwordHash,
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account);

  // 2. 첫 번째 세션 생성(로그인) 요청
  const token1 = RandomGenerator.alphaNumeric(64); // 실제 토큰 가정
  const issuedAt1 = new Date().toISOString();
  const expiresAt1 = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(); // 2시간 뒤
  const session1 = await api.functional.attendance.auth.sessions.post(connection, {
    body: {
      auth_account_id: account.id,
      session_token: token1,
      issued_at: issuedAt1,
      expires_at: expiresAt1,
      user_agent: "E2E Test UA/1.0",
      ip_address: "127.0.0.1",
    } satisfies IAttendanceAuthSession.ICreate,
  });
  typia.assert(session1);
  TestValidator.equals("auth_account_id check")(session1.auth_account_id)(account.id);
  TestValidator.equals("token check")(session1.session_token)(token1);
  TestValidator.equals("issued_at check")(session1.issued_at)(issuedAt1);
  TestValidator.equals("expires_at check")(session1.expires_at)(expiresAt1);
  TestValidator.equals("user_agent check")(session1.user_agent)("E2E Test UA/1.0");
  TestValidator.equals("ip_address check")(session1.ip_address)("127.0.0.1");

  // 3. 동일 계정-다른 토큰(중복 로그인)으로 세션 추가 생성
  const token2 = RandomGenerator.alphaNumeric(64);
  const issuedAt2 = new Date(Date.now() + 1000).toISOString(); // 1초 뒤 시간차
  const expiresAt2 = new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(); // 3시간 뒤
  const session2 = await api.functional.attendance.auth.sessions.post(connection, {
    body: {
      auth_account_id: account.id,
      session_token: token2,
      issued_at: issuedAt2,
      expires_at: expiresAt2,
      user_agent: "E2E Test UA/1.0",
      ip_address: "127.0.0.1",
    } satisfies IAttendanceAuthSession.ICreate,
  });
  typia.assert(session2);
  // 동일 계정, 토큰/id/발급시간/만료시간 등은 서로 달라야 함
  TestValidator.equals("auth_account_id for 2nd session")(session2.auth_account_id)(account.id);
  TestValidator.notEquals("session id must differ")(session2.id)(session1.id);
  TestValidator.notEquals("session token must differ")(session2.session_token)(session1.session_token);
  TestValidator.notEquals("issued_at must differ")(session2.issued_at)(session1.issued_at);
  TestValidator.notEquals("expires_at must differ")(session2.expires_at)(session1.expires_at);
  TestValidator.equals("user_agent of 2nd session")(session2.user_agent)("E2E Test UA/1.0");
  TestValidator.equals("ip_address of 2nd session")(session2.ip_address)("127.0.0.1");
}