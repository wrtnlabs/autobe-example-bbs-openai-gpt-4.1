import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 이미 사용 중인 이메일로 인증계정의 이메일을 변경 시도할 때 409 Conflict 에러가 적절하게 반환되는지 검증합니다.
 *
 * 이 테스트는 다음 과정을 포함합니다:
 * 1. 서로 다른 이메일로 인증계정 두 개를 각각 생성합니다.
 * 2. 계정1의 이메일을 계정2의 이메일로 변경 시도합니다.
 * 3. 이때 409 Conflict 에러가 발생해야 하며, 정상적으로 에러가 발생하는지 확인합니다.
 * 4. 성공/실패 모두 실제 DB 상태는 불변해야 함을 후속 상태조회로 병행 점검할 수 있습니다.
 */
export async function test_api_attendance_auth_accounts_test_update_auth_account_to_duplicate_email(
  connection: api.IConnection,
) {
  // 1. 첫 번째 계정(email1) 생성
  const email1: string = typia.random<string & tags.Format<"email">>();
  const passwordHash1: string = typia.random<string>();
  const account1 = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: email1,
      password_hash: passwordHash1,
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account1);

  // 2. 두 번째 계정(email2) 생성
  let email2: string;
  do {
    email2 = typia.random<string & tags.Format<"email">>();
  } while (email2 === email1);
  const passwordHash2: string = typia.random<string>();
  const account2 = await api.functional.attendance.auth.accounts.post(connection, {
    body: {
      email: email2,
      password_hash: passwordHash2,
    } satisfies IAttendanceAuthAccount.ICreate,
  });
  typia.assert(account2);

  // 3. 계정1의 이메일을 계정2의 이메일로 변경 시도 → 409 오류 검증
  await TestValidator.error("중복 이메일로 변경 시도시 409 Conflict")(
    async () => {
      await api.functional.attendance.auth.accounts.putById(connection, {
        id: account1.id,
        body: {
          email: email2,
        } satisfies IAttendanceAuthAccount.IUpdate,
      });
    },
  );

  // 4. 실제 계정1/2의 이메일 상태는 불변임을 확인
  // (수정 실패 후 계정 이메일이 변하지 않아야 함)
  // ※ 실제 조회 API가 있다면 추가 조회 및 비교가 필요합니다.
  // 단, 본 시점에서는 별도 at/get API가 없으므로 상태조회는 생략합니다.
}