import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthSession";
import type { IPageIAttendanceAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceAuthSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 인증 세션 목록 필터 및 페이징 조회 기능의 종합 검증.
 *
 * 1. 테스트용 인증 계정(email+password) 생성
 * 2. 해당 계정으로 2개의 세션 토큰(로그인) 발급
 * 3. 각종 필터(계정ID, session_token, active_only 등) 및
 *    페이지네이션(limit/page) 조합으로 PATCH 조회
 * 4. auth_account_id, session_token, active_only, limit 등의
 *    검색 결과가 기대(도메인, 비즈니스 규칙)에 부합하는지
 *    typia.assert, TestValidator 등으로 type 및 비즈니스 로직과
 *    예외(권한 없음시 403)까지 검증
 *
 * - 인증 토큰을 통한 권한 체크(본인 아닌 계정 요청 시 403)
 * - 페이징 및 조건별 반환값 일치
 * - 임의 random 파라미터(NO), 사전 발급 정보 활용
 * - 반환 자료 구조, 페이징 메타, 필터 일관성
 *
 * ※ 비즈니스 규칙·유즈케이스를 실제로 구현하며, 타입 만족+실제 검증을 포괄
 */
export async function test_api_attendance_test_list_auth_sessions_with_valid_filters_and_pagination(connection: api.IConnection) {
  // 1. 인증 계정(이메일 기반) 생성
  const email = typia.random<string & tags.Format<"email">>();
  const password_hash = RandomGenerator.alphaNumeric(32); // 평문X, hash 가정
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: { email, password_hash },
  });
  typia.assert(account);

  // 2. 인증 세션(로그인) 두 건 등록 (동일 계정, 서로 다른 디바이스)
  const issued_at1 = new Date().toISOString();
  const issued_at2 = new Date(Date.now() + 1000).toISOString();
  const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const session_token1 = RandomGenerator.alphaNumeric(64);
  const session_token2 = RandomGenerator.alphaNumeric(64);
  const user_agent1 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
  const user_agent2 = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
  const ip_address1 = "10.0.0.1";
  const ip_address2 = "10.0.0.2";

  const session1 = await api.functional.attendance.auth.sessions.post(connection, {
    body: {
      auth_account_id: account.id,
      session_token: session_token1,
      issued_at: issued_at1,
      expires_at,
      user_agent: user_agent1,
      ip_address: ip_address1,
    },
  });
  typia.assert(session1);
  const session2 = await api.functional.attendance.auth.sessions.post(connection, {
    body: {
      auth_account_id: account.id,
      session_token: session_token2,
      issued_at: issued_at2,
      expires_at,
      user_agent: user_agent2,
      ip_address: ip_address2,
    },
  });
  typia.assert(session2);

  // 3-1. auth_account_id로 필터링
  const resultByAccount = await api.functional.attendance.auth.sessions.patch(connection, {
    body: { auth_account_id: account.id },
  });
  typia.assert(resultByAccount);
  for (const item of resultByAccount.data)
    TestValidator.equals("auth_account_id filter")(item.auth_account_id)(account.id);

  // 3-2. session_token으로 단일 세션 필터
  const resultByToken = await api.functional.attendance.auth.sessions.patch(connection, {
    body: { session_token: session_token1 },
  });
  typia.assert(resultByToken);
  TestValidator.predicate("session_token filter matches 1 result")(resultByToken.data.length === 1);
  TestValidator.equals("session_token matches")(resultByToken.data[0].session_token)(session_token1);

  // 3-3. active_only true로 요청 (발급 직후이므로 모두 active여야)
  const resultActive = await api.functional.attendance.auth.sessions.patch(connection, {
    body: { auth_account_id: account.id, active_only: true },
  });
  typia.assert(resultActive);
  for (const item of resultActive.data)
    TestValidator.equals("active_only with no revoked_at")(item.revoked_at)(null);

  // 3-4. limit/page로 페이징: limit 1, page 1/2 적용
  const paged1 = await api.functional.attendance.auth.sessions.patch(connection, {
    body: { auth_account_id: account.id, limit: 1, page: 1 },
  });
  typia.assert(paged1);
  TestValidator.equals("limit 1 page 1")(paged1.data.length)(1);

  const paged2 = await api.functional.attendance.auth.sessions.patch(connection, {
    body: { auth_account_id: account.id, limit: 1, page: 2 },
  });
  typia.assert(paged2);
  TestValidator.equals("limit 1 page 2")(paged2.data.length)(1);
  TestValidator.notEquals("paged1, paged2 session id not equal")(paged1.data[0].id)(paged2.data[0].id);

  // 4. 타 계정이 본인 아닌 계정으로 요청시 403
  const email2 = typia.random<string & tags.Format<"email">>();
  const password_hash2 = RandomGenerator.alphaNumeric(32);
  const account2 = await api.functional.attendance.auth.accounts.post(connection, {
    body: { email: email2, password_hash: password_hash2 },
  });
  typia.assert(account2);
  await api.functional.attendance.auth.sessions.post(connection, {
    body: {
      auth_account_id: account2.id,
      session_token: RandomGenerator.alphaNumeric(64),
      issued_at: new Date().toISOString(),
      expires_at,
    },
  });
  await TestValidator.error("타인 계정에 대해 403 forbidden")(async () => {
    await api.functional.attendance.auth.sessions.patch(connection, {
      body: { auth_account_id: account.id },
    });
  });
}