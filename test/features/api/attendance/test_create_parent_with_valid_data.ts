import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 필수 정보로 신규 학부모 등록 성공 시나리오 검증
 *
 * 이 테스트는 정상적인 학부모 신규가입 전체 플로우(인증 계정 → 학부모 프로필 등록)를 검증한다.
 *
 * 과정:
 * 1. 인증용 계정(attendance_auth_account) 정보(이메일, 비밀번호 해시)로 계정 신규 생성
 * 2. 위의 계정 id를 활용해 학부모 회원을 이름, 이메일, 연락처 모두 입력하여 생성
 * 3. 반환값에서 id, 입력값, 생성·수정일(ISO8601), 필수 필드 존재 등 정확성 검증
 */
export async function test_api_attendance_test_create_parent_with_valid_data(
  connection: api.IConnection,
) {
  // 1. 인증 계정 생성 (이메일/비밀번호 해시)
  const accountEmail: string = typia.random<string & tags.Format<"email">>();
  const passwordHash: string = typia.random<string>(); // 단순 해시값 시뮬레이션
  const authAccount = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: accountEmail,
      password_hash: passwordHash,
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(authAccount);
  // 유효한 UUID와 입력 값 검증
  TestValidator.equals("email 일치")(authAccount.email)(accountEmail);
  TestValidator.equals("비밀번호 해시는 그대로 저장됨")(
    authAccount.password_hash
  )(passwordHash);
  TestValidator.predicate("id는 uuid 포맷")(
    typeof authAccount.id === "string" &&
    /^[0-9a-fA-F\-]{36}$/.test(authAccount.id)
  );

  // 2. 학부모 회원 등록 (필수: 인증계정id/이름/이메일/연락처)
  const parentName: string = RandomGenerator.name();
  const parentEmail: string = typia.random<string & tags.Format<"email">>();
  const parentPhone: string = RandomGenerator.mobile();

  const parent = await api.functional.attendance.parents.post(connection, {
    body: {
      auth_account_id: authAccount.id,
      name: parentName,
      email: parentEmail,
      phone: parentPhone,
    } satisfies IAttendanceParent.ICreate,
  });
  typia.assert(parent);

  // 3. 반환값: 입력값과 반환 필드 정확성 검증
  // id: 유효 uuid
  TestValidator.predicate("parent.id 형식: uuid")(
    typeof parent.id === "string" && /^[0-9a-fA-F\-]{36}$/.test(parent.id)
  );
  // 필수 입력값: auth_account_id/name/email/phone
  TestValidator.equals("auth_account_id 일치")(parent.auth_account_id)(authAccount.id);
  TestValidator.equals("name 일치")(parent.name)(parentName);
  TestValidator.equals("email 일치")(parent.email)(parentEmail);
  TestValidator.equals("phone 일치")(parent.phone)(parentPhone);
  // 생성·수정일: ISO8601
  TestValidator.predicate("created_at ISO-8601 포맷")(
    typeof parent.created_at === "string" && /T.*Z$/.test(parent.created_at)
  );
  TestValidator.predicate("updated_at ISO-8601 포맷")(
    typeof parent.updated_at === "string" && /T.*Z$/.test(parent.updated_at)
  );
}