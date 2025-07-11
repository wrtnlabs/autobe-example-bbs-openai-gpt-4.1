import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceParent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceParent";

/**
 * 이미 등록된 이메일/인증계정ID로 학부모 회원 추가 시 409(중복) 에러 발생 검증
 *
 * 학부모(보호자) 회원 신규 등록 API의 유니크 제약(email, auth_account_id 중복 불가) 동작을 검증합니다.
 *
 * 1. typia.random을 이용해 신규 학부모회원 ICreate 객체를 생성한다.
 * 2. 정상적으로 회원가입이 성공함을 typia.assert로 확인
 * 3. 동일 email+auth_account_id로 중복 가입을 시도해 409 충돌을 검증
 * 4. email만 동일, auth_account_id를 수정한 입력값으로 중복 가입 시도 (409 반환 검증)
 * 5. auth_account_id만 동일, email을 변경한 입력값으로 중복 가입 시도 (409 반환 검증)
 * 각 케이스는 TestValidator.error("409 중복 에러")(() => ...) 패턴으로 409 에러 발생을 검증한다.
 */
export async function test_api_attendance_test_create_parent_with_duplicate_email_or_auth_account(
  connection: api.IConnection,
) {
  // 1. 신규 학부모 회원 데이터 준비
  const input: IAttendanceParent.ICreate = typia.random<IAttendanceParent.ICreate>();

  // 2. 정상 회원가입
  const parent = await api.functional.attendance.parents.post(connection, {
    body: input,
  });
  typia.assert(parent);

  // 3. (case1) email+auth_account_id 모두 동일하게 중복 가입 시도
  TestValidator.error("409 중복 에러 - email+auth_account_id 둘 다 중복")(() =>
    api.functional.attendance.parents.post(connection, { body: input })
  );

  // 4. (case2) email만 동일, auth_account_id는 새 UUID로 시도
  const onlyEmailDup: IAttendanceParent.ICreate = {
    ...input,
    auth_account_id: typia.random<string & tags.Format<"uuid">>()
  };
  TestValidator.error("409 중복 에러 - email만 중복")(() =>
    api.functional.attendance.parents.post(connection, { body: onlyEmailDup })
  );

  // 5. (case3) auth_account_id만 동일, email은 새 임의값으로 시도
  const onlyAuthDup: IAttendanceParent.ICreate = {
    ...input,
    email: `${typia.random<string & tags.Format<"uuid">>()}@duptest.com` // uuid 기반으로 임의 생성
  };
  TestValidator.error("409 중복 에러 - auth_account_id만 중복")(() =>
    api.functional.attendance.parents.post(connection, { body: onlyAuthDup })
  );
}