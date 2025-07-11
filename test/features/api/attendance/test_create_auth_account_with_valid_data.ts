import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 유효한 이메일과 강력한 패스워드 등 요구되는 정보로 인증 계정(Attendance Auth Account) 등록 요청의 정상 동작을 검증합니다.
 * 
 * - 이메일 주소와 강력한(적절한 길이로 생성된) 패스워드 해시를 입력해 계정 등록 요청을 수행합니다.
 * - 응답 객체로 id, email, created_at 등 주요 필드가 정상적으로 반환되는지 검증합니다.
 * - password_hash 등 보안 필드는 평문이 아닌지 검증합니다(패스워드 값이 아닌지 확인).
 * - 중복 없는 값(랜덤 이메일)로 실제 신규 생성 여부를 검증합니다.
 */
export async function test_api_attendance_auth_accounts_post(
  connection: api.IConnection,
) {
  // 1. 테스트용 유효한 이메일·패스워드 해시값을 생성합니다.
  const email: string = typia.random<string & tags.Format<"email">>();
  const passwordHash: string = RandomGenerator.alphaNumeric(36); // 충분히 강력한 해시값으로 가정

  // 2. 인증 계정 등록 API를 호출합니다.
  const account = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email,
      password_hash: passwordHash,
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account);

  // 3. 응답값 주요 필드 검증
  TestValidator.equals("반환 이메일 일치")(account.email)(email);
  TestValidator.predicate("ID는 UUID 형식이어야 함")(account.id.match(/^[0-9a-fA-F\-]{36}$/) != null);
  TestValidator.predicate("생성일시(ISO8601) 반환")(account.created_at.match(/^\d{4}\-\d{2}\-\d{2}T/) != null);

  // 4. 보안 필드(비밀번호) 평문 노출 금지 검증(optional specification)
  TestValidator.notEquals("응답 password_hash는 평문 아님")(account.password_hash)(passwordHash);
}