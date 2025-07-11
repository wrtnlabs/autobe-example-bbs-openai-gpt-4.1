import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthSession";

/**
 * 타인 소유 인증 세션의 상태 변경 시도에 대한 권한 거부(403) 응답 검증 E2E 테스트
 *
 * 본 테스트는 인증 세션의 소유자가 아닌 사용자가 해당 세션의 메타데이터(예: 만료일 연장, 세션 취소 등)를 bearer token을 이용해 변경 시도할 때, 시스템이 적절히 403 Forbidden을 반환하는지 확인하기 위한 시나리오입니다.
 *
 * [테스트 시나리오 단계]
 * 1. 계정 A(세션 소유자)와 계정 B(비소유자, 공격자 역할) 두 계정을 생성한다.
 * 2. 계정 A로 인증 세션을 하나 생성한다.
 * 3. 계정 B의 bearer token(Authorization 헤더 세팅)을 이용하여, 계정 A가 소유한 세션의 상태(예: 만료 시각, 강제 로그아웃 등)를 변경하는 PUT /attendance/auth/sessions/{id} API를 호출한다.
 * 4. API가 403 Forbidden 에러(권한 없음)으로 응답하는지 TestValidator.error로 검증한다.
 *
 * 실제 bearer token 적용 등은 connection 객체의 헤더 교체(authorization 세팅 등)로 구현.
 */
export async function test_api_attendance_test_update_auth_session_status_by_non_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. 계정 A와 B를 생성한다.
  const accountA = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<string>(),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(accountA);
  const accountB = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<string>(),
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(accountB);

  // 2. 계정 A(세션 소유자)로 인증 세션을 생성
  const sessionA = await api.functional.attendance.auth.sessions.post(connection, {
    body: {
      auth_account_id: accountA.id,
      session_token: typia.random<string>(),
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      user_agent: "E2E TEST AGENT",
      ip_address: "127.0.0.1",
    } satisfies IAttendanceAuthSession.ICreate,
  });
  typia.assert(sessionA);

  // 3. 계정 B로 인증 세션(Bearer token) 발급 및 connection 헤더에 토큰 세팅(가정: token은 session_token)
  const sessionB = await api.functional.attendance.auth.sessions.post(connection, {
    body: {
      auth_account_id: accountB.id,
      session_token: typia.random<string>(),
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      user_agent: "E2E TEST AGENT",
      ip_address: "127.0.0.1",
    } satisfies IAttendanceAuthSession.ICreate,
  });
  typia.assert(sessionB);

  const connectionB = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${sessionB.session_token}`,
    },
  };

  // 4. 계정 B의 토큰으로 계정 A 소유 세션의 상태 변경(예시: 만료 시각 연장) 시도 → 403 Forbidden 검증
  await TestValidator.error("비소유자 세션 상태 변경시 403 반환")(
    async () => {
      await api.functional.attendance.auth.sessions.putById(connectionB, {
        id: sessionA.id,
        body: {
          expires_at: new Date(Date.now() + 7200 * 1000).toISOString(),
        } satisfies IAttendanceAuthSession.IUpdate,
      });
    },
  );
}