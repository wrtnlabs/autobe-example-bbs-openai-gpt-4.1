import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 존재하지 않는(또는 이미 삭제된) 인증계정 id로 삭제 시도시 404 Not Found 오류 검증
 *
 * 이 테스트는 /attendance/auth/accounts/{id} 엔드포인트에서 실제 존재하지 않는(또는 이미 soft-delete 된) 인증계정 id를 이용해 삭제 시도를 하면 적절한 에러(404 등 Not Found)가 반환되는지를 검증합니다.
 *
 * 유효한 계정 흐름(생성-삭제)을 사용하지 않고, 반드시 사용된 적 없는 UUID 형식 id로 직접 API를 호출함으로써 실제 데이터에 영향을 주지 않습니다.
 *
 * [진행 순서]
 * 1. 유효 UUID를 랜덤 생성 (해당 id는 반드시 존재하지 않아야 함)
 * 2. DELETE /attendance/auth/accounts/{id} API를 호출
 * 3. TestValidator.error()로 에러 발생 여부 검증 (에러 종류(404) 메시지는 신뢰하지 않고, 에러 자체 발생만 확인)
 */
export async function test_api_attendance_test_delete_auth_account_not_found(
  connection: api.IConnection,
) {
  // 1. 유효 UUID 형식이지만 절대 존재하지 않는 id 생성
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  // 2. 존재하지 않는 id로 삭제 시도 → 반드시 예외 발생을 검증
  await TestValidator.error("존재하지 않는 인증계정 삭제 시도시 에러 throw 됨")(
    async () => {
      await api.functional.attendance.auth.accounts.eraseById(connection, {
        id: nonExistentId,
      });
    },
  );
}