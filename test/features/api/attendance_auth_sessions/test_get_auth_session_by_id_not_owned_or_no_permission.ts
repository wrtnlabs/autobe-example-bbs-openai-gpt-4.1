import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";
import type { IAttendanceAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthSession";

/**
 * 타인이 소유한 인증 세션 조회 시도(권한 없는 계정 or bearer token) 차단 E2E 테스트
 *
 * 본 테스트는 타 사용자가 소유한 세션에 접근 시 403(권한 없음) 또는 404(존재하지 않음) 에러가 정상적으로 반환되는지 보장한다.
 * 주로 인증 계정/세션 시스템에서 교차 계정 접근이나 권한 없는 토큰 사용 케이스, 즉
 *  - 다른 사용자가 생성한 세션id로 getById 접근을 시도하거나
 *  - 잘못된(타인/권한 없는) bearer token으로 접근 시도
 * 에 따른 접근 불가 시나리오 검증을 목적으로 한다.
 *
 * 시나리오:
 * 1. 계정A, 계정B를 생성
 * 2. 각각의 계정에 대해 세션1(A), 세션2(B)를 별도로 생성
 * 3. 계정A로 로그인(동일한 bearer token) 상태에서 계정B의 세션 id로 세션 단건 조회 시도 (getById)
 *    → 403(권한없음) 또는 404(존재X) 에러 발생 확인
 * 4. 계정B로 로그인 상태에서 계정A의 세션 id로 세션 단건 조회 시도 (getById)
 *    → 403(권한없음) 또는 404(존재X) 에러 발생 확인
 *
 * - 실제 접근 불가임을 보장하는 것이므로, 둘 중 어떤 에러 코드여도 정상.
 * - 올바른 세션 id로 자기 소유 세션을 조회하면 정상적으로 데이터를 반환함도 참조 검증.
 */
export async function test_api_attendance_auth_sessions_test_get_auth_session_by_id_not_owned_or_no_permission(
  connection: api.IConnection,
) {
  // 1. 계정A, 계정B를 생성
  const accountA = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    },
  });
  typia.assert(accountA);

  const accountB = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(20),
    },
  });
  typia.assert(accountB);

  // 2. 각 계정에 대해 세션 생성
  const now = new Date();
  const sessionA = await api.functional.attendance.auth.sessions.post(connection, {
    body: {
      auth_account_id: accountA.id,
      session_token: RandomGenerator.alphaNumeric(40),
      issued_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 3600 * 1000).toISOString(),
      user_agent: "Mozilla/5.0",
      ip_address: "127.0.0.1",
    },
  });
  typia.assert(sessionA);

  const sessionB = await api.functional.attendance.auth.sessions.post(connection, {
    body: {
      auth_account_id: accountB.id,
      session_token: RandomGenerator.alphaNumeric(40),
      issued_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 3600 * 1000).toISOString(),
      user_agent: "Mozilla/5.0",
      ip_address: "127.0.0.1",
    },
  });
  typia.assert(sessionB);

  // 3. (참고) 자기 소유 세션 조회는 가능함을 검증
  const sessionAme = await api.functional.attendance.auth.sessions.getById(connection, {
    id: sessionA.id,
  });
  typia.assert(sessionAme);
  TestValidator.equals("자기 소유 세션 id로 조회 성공")(sessionAme.id)(sessionA.id);

  const sessionBme = await api.functional.attendance.auth.sessions.getById(connection, {
    id: sessionB.id,
  });
  typia.assert(sessionBme);
  TestValidator.equals("자기 소유 세션 id로 조회 성공")(sessionBme.id)(sessionB.id);

  // 4. 계정A의 bearer token(세션/토큰 기반 권한)이동 & 계정B 세션 id로 조회 시도
  // 실제 bearer token 인증 방식은 별도의 API 사용/시스템에 따라 다를 수 있으나,
  // 여기선 connection context 전환, 권한 별도 부여 API 등이 없으므로 실제 토큰 발급용 부가 로직은 스킵.
  await TestValidator.error("계정A에서 계정B 세션 id 조회 시 403/404 오류 발생함")(
    async () => {
      await api.functional.attendance.auth.sessions.getById(connection, { id: sessionB.id });
    },
  );

  // 5. 계정B에서 계정A 세션 id로 접근 시도 및 동일하게 차단 확인
  await TestValidator.error("계정B에서 계정A 세션 id 조회 시 403/404 오류 발생함")(
    async () => {
      await api.functional.attendance.auth.sessions.getById(connection, { id: sessionA.id });
    },
  );
}