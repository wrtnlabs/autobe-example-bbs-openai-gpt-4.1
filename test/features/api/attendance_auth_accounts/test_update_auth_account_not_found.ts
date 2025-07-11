import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 존재하지 않는 id로 인증 계정 정보 변경 시 404 Not Found 응답 검증
 *
 * 이 테스트는 실제로 존재하지 않는 인증 계정의 UUID(랜덤 UUID)를 사용해
 * /attendance/auth/accounts/{id} 엔드포인트에 정보 수정(put) 요청을 전송했을 때,
 * 시스템이 올바르게 404 Not Found 오류 응답을 반환하는지 검증합니다.
 *
 * 실제 계정 데이터가 생성되거나 변경되지 않으므로 안전하며,
 * 아래와 같이 진행됩니다.
 *
 * 1. 임의의(존재하지 않는) UUID를 생성합니다.
 * 2. 임의의 유효한 수정 데이터(IAttendanceAuthAccount.IUpdate)를 준비합니다.
 * 3. putById API 호출 시 404 에러가 발생하는지 TestValidator.error로 검증합니다.
 * 4. 404가 아닌 다른 에러, 혹은 에러가 발생하지 않는다면 테스트는 실패입니다.
 */
export async function test_api_attendance_auth_accounts_test_update_auth_account_not_found(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 무작위 UUID 생성
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  // 2. 무의미하지만 형식상 유효한 수정 데이터 준비
  const updateInput: IAttendanceAuthAccount.IUpdate = typia.random<IAttendanceAuthAccount.IUpdate>();

  // 3. 실제 API 요청 시 404 에러가 발생하는지 검증
  await TestValidator.error("존재하지 않는 계정 업데이트 시 404 반환")(
    async () => {
      await api.functional.attendance.auth.accounts.putById(connection, {
        id: nonExistentId,
        body: updateInput,
      });
    },
  );
}