import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 존재하지 않거나 삭제된 인증 계정 조회 시 404 응답 검증
 *
 * 이 테스트는 /attendance/auth/accounts/{id} 엔드포인트에, 존재하지 않거나 이미 삭제(비활성화)된 인증 계정의 id를 사용하여 상세 조회를 요청했을 때 404 Not Found 에러가 정상적으로 반환되는지 검증합니다.
 * 실제 존재하지 않는 UUID를 typia.random<string & tags.Format<"uuid">>()로 무작위 생성하여 id로 사용합니다.
 * 본 테스트는 사전 의존성을 필요로 하지 않으며, 예외가 발생하는지만 TestValidator.error로 검증합니다.
 *
 * 1. 무작위 UUID를 id 값으로 사용하여 상세 조회 시도
 * 2. 예외(오류) 발생 여부만 검증 (404 status 코드 상세 체크 생략)
 */
export async function test_api_attendance_auth_accounts_test_get_auth_account_by_id_not_found(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 인증 계정의 id (무작위 UUID 생성)
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();

  // 2. 상세 조회 요청 시 404 Not Found 오류가 발생하는지 검증
  await TestValidator.error("존재하지 않는 계정 id 조회 시 404 에러 반환")(
    async () => {
      await api.functional.attendance.auth.accounts.getById(connection, { id: nonExistentId });
    },
  );
}