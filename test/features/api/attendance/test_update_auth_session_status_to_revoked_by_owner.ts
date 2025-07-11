import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthSession";

/**
 * 인증 세션 소유자에 의한 세션 상태 변경(예: 강제 로그아웃) 정상 동작 검증
 *
 * 1. 인증 계정(로그인 소유 계정)을 신규 생성한다.
 * 2. 해당 계정으로 신규 인증 세션(로그인/토큰 발급)을 생성한다.
 * 3. 발급된 세션의 revoked_at 필드를 업데이트(예: 현재 시각으로 강제 만료/로그아웃) 요청한다.
 * 4. 응답으로 반환되는 세션 정보가 실제 업데이트 내용을 반영하는지 검증한다.
 *
 * - revoked_at 필드는 null → ISO 8601 문자열(현재 시각) 으로 변경되어야 한다.
 * - 그 외 immutable 필드(issued_at, session_token, id 등)는 변경되지 않아야 한다.
 * - 세션의 소유자인 계정(auth_account_id)로 직접 요청하는 정상 플로우를 검증한다.
 */
export async function test_api_attendance_test_update_auth_session_status_to_revoked_by_owner(
  connection: api.IConnection,
) {
  // 1. 인증 계정 생성
  const email = typia.random<string & tags.Format<"email">>();
  const password_hash = typia.random<string>();
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email,
      password_hash,
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account);

  // 2. 인증 세션(로그인) 발급
  const session_token = typia.random<string>();
  const issued_at = new Date().toISOString();
  const expires_at = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  const session = await api.functional.attendance.auth.sessions.post(connection, {
    body: {
      auth_account_id: account.id,
      session_token,
      issued_at,
      expires_at,
    } satisfies IAttendanceAuthSession.ICreate,
  });
  typia.assert(session);

  // 3. 세션 강제 로그아웃(상태 업데이트) - revoked_at 필드 업데이트
  const revoked_at = new Date().toISOString();
  const updated = await api.functional.attendance.auth.sessions.putById(connection, {
    id: session.id,
    body: {
      revoked_at,
    } satisfies IAttendanceAuthSession.IUpdate,
  });
  typia.assert(updated);

  // 4. 반환 데이터 검증
  // revoked_at 정상 반영
  TestValidator.equals("revoked_at 반영됨")(updated.revoked_at)(revoked_at);
  // 불변 필드(issued_at/토큰/id...) 변경 없음
  TestValidator.equals("세션 id 동일")(updated.id)(session.id);
  TestValidator.equals("session_token 동일")(updated.session_token)(session.session_token);
  TestValidator.equals("issued_at 동일")(updated.issued_at)(session.issued_at);
  TestValidator.equals("auth_account_id 동일")(updated.auth_account_id)(session.auth_account_id);
  TestValidator.equals("expires_at 동일")(updated.expires_at)(session.expires_at);
}