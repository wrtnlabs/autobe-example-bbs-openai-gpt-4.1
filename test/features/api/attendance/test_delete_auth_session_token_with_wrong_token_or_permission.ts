import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthSession";

/**
 * 세션 삭제(폐기) 권한 및 에러케이스 검증
 *
 * 타인의 세션을 삭제하거나, 올바르지 않은 Bearer 토큰(권한 불일치)으로 세션 삭제를 시도할 때
 * 시스템이 403(권한 오류), 404(세션 없음) 등 적절한 상태 코드를 반환하는지 확인합니다.
 *
 * 주요 시나리오:
 * 1. 계정A와 계정B를 각각 생성합니다.
 * 2. 각 계정마다 세션을 하나씩 발급받습니다.
 * 3. 계정A의 세션 토큰으로, 계정B의 세션 삭제를 시도하면 403 혹은 404 등 권한/존재 오류를 반환해야 합니다.
 * 4. 존재하지 않는 세션 id로 삭제를 시도하면 404를 반환해야 합니다.
 * 5. (옵션) 임의의 잘못된 bearer token(정상 생성된 세션 토큰이 아님)으로 세션 삭제를 시도하면 403 오류 반환을 검증합니다.
 */
export async function test_api_attendance_test_delete_auth_session_token_with_wrong_token_or_permission(
  connection: api.IConnection,
) {
  // 1. 계정A, 계정B 생성
  const accountA = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(accountA);
  const accountB = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(accountB);

  // 2. 각 계정별 세션 생성
  const sessionA = await api.functional.attendance.auth.sessions.post(connection, {
    body: {
      auth_account_id: accountA.id,
      session_token: RandomGenerator.alphaNumeric(32),
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    } satisfies IAttendanceAuthSession.ICreate,
  });
  typia.assert(sessionA);
  const sessionB = await api.functional.attendance.auth.sessions.post(connection, {
    body: {
      auth_account_id: accountB.id,
      session_token: RandomGenerator.alphaNumeric(32),
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    } satisfies IAttendanceAuthSession.ICreate,
  });
  typia.assert(sessionB);

  // 기존 연결 상태 저장
  const baseHeaders = { ...connection.headers };

  // 3. 계정A의 세션 토큰(Bearer)으로 계정B의 세션 삭제 시도 -> 403 or 404
  connection.headers = {
    ...baseHeaders,
    Authorization: `Bearer ${sessionA.session_token}`,
  };
  await TestValidator.error("타인의 세션 삭제는 403/404 오류가 발생해야 함")(async () => {
    await api.functional.attendance.auth.sessions.eraseById(connection, {
      id: sessionB.id,
    });
  });

  // 4. 존재하지 않는 세션 id로 삭제 시도 -> 404
  await TestValidator.error("존재하지 않는 세션 id 삭제는 404 오류가 발생해야 함")(async () => {
    await api.functional.attendance.auth.sessions.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 5. 완전히 임의의 잘못된 bearer token으로 삭제 시도 -> 403
  connection.headers = {
    ...baseHeaders,
    Authorization: `Bearer ${RandomGenerator.alphaNumeric(32)}`,
  };
  await TestValidator.error("임의의 잘못된 bearer token 삭제 시도는 403 오류가 발생해야 함")(async () => {
    await api.functional.attendance.auth.sessions.eraseById(connection, {
      id: sessionA.id,
    });
  });

  // 연결 헤더 복원
  connection.headers = baseHeaders;
}