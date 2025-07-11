import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * 이미 삭제됐거나 존재하지 않는 접근 로그 ID로 삭제 요청 시 404 not found 에러를 반환하는지 검증한다.
 *
 * 1. 존재하지 않는 UUID를 생성한다.
 * 2. 접근 로그 삭제 API를 해당 UUID로 호출한다.
 * 3. 404 not found 에러가 발생하는지 확인한다.
 */
export async function test_api_attendance_test_delete_access_log_not_found_error(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 접근 로그 ID(uuid) 생성
  const notExistId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();

  // 2. 접근 로그 삭제 요청 -> 반드시 404 에러가 발생해야 한다
  await TestValidator.error("존재하지 않는 접근 로그 삭제시 404 반환")(
    async () => {
      await api.functional.attendance.accessLogs.eraseById(connection, {
        id: notExistId,
      });
    },
  );
}