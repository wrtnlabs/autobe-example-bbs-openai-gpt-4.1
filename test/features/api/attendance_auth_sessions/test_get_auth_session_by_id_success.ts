import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthSession";

/**
 * 세션 상세정보 (토큰, 만료, 발행시각, device/agent 등)를 올바르게 반환하는지 검사합니다.
 *
 * 비즈니스 컨텍스트 및 테스트 필요성:
 * - 본인 인증 후, 본인 소유의 세션 UUID로 상세 조회를 요청했을 때 모든 주요 필드(토큰, 계정 id, 만료, 발급 일시, 디바이스 정보 등)가 정상적으로 반환되는지를 검증합니다.
 *
 * 테스트 절차:
 * 1. 인증용 계정을 신규 생성한다.
 * 2. 해당 계정으로 인증 세션(로그인)을 생성한다.
 * 3. 반환된 세션 id(UUID)로 상세 정보를 조회한다.
 * 4. 상세 정보의 각 필드 값이 세션 생성 시 입력값과 일치하는지 검증한다.
 */
export async function test_api_attendance_auth_sessions_test_get_auth_session_by_id_success(
  connection: api.IConnection,
) {
  // 1. 인증 계정 생성: 이메일/비밀번호 해시 기반 신규 인증 계정 등록
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<string>(),
    },
  });
  typia.assert(account);

  // 2. 세션 생성 (ex: 로그인): 신규 세션 토큰, 발급/만료시각, user-agent/IP 등 메타 포함
  const sessionPayload = {
    auth_account_id: account.id,
    session_token: typia.random<string>(),
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1시간
    user_agent: "Mozilla/5.0 (X11; Linux x86_64)",
    ip_address: "127.0.0.1",
  } satisfies IAttendanceAuthSession.ICreate;
  const session = await api.functional.attendance.auth.sessions.post(connection, {
    body: sessionPayload,
  });
  typia.assert(session);

  // 3. 세션 상세 조회: 반환받은 세션 id(UUID)로 상세 정보 API 호출
  const output = await api.functional.attendance.auth.sessions.getById(connection, {
    id: session.id,
  });
  typia.assert(output);

  // 4. 세션 정보 상세 값 검증: 생성 시 입력값과 일치 여부 확인
  TestValidator.equals("auth_account_id")(output.auth_account_id)(account.id);
  TestValidator.equals("session_token")(output.session_token)(sessionPayload.session_token);
  TestValidator.equals("issued_at")(output.issued_at)(sessionPayload.issued_at);
  TestValidator.equals("expires_at")(output.expires_at)(sessionPayload.expires_at);
  TestValidator.equals("user_agent")(output.user_agent)(sessionPayload.user_agent);
  TestValidator.equals("ip_address")(output.ip_address)(sessionPayload.ip_address);
  TestValidator.equals("revoked_at")(output.revoked_at)(null);
}