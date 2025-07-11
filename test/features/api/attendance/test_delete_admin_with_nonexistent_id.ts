import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";

/**
 * 존재하지 않는 관리자 ID로 삭제 요청 시 404 Not Found 오류를 검증합니다.
 *
 * - 관리자를 삭제하는 /attendance/admins/{id} (DELETE) 엔드포인트에 실제 존재하지 않는 id 값을 사용해 호출할 때,
 *   404 Not Found 오류가 정상적으로 반환되는지 확인합니다.
 * - 본 테스트는 실레코드가 삭제되는 동작은 일어나지 않으며, 에러 반환만 검증합니다.
 *
 * 절차
 * 1. 존재하지 않는 무작위 UUID를 생성합니다.
 * 2. 해당 UUID로 관리자 삭제 API를 호출합니다.
 * 3. 404 Not Found 오류가 발생하는지 TestValidator.error()로 확인합니다.
 */
export async function test_api_attendance_admins_eraseById_test_delete_admin_with_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 임의의 UUID 생성
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  // 2~3. 삭제 요청 시 404 Not Found 에러 발생 여부 확인
  await TestValidator.error("존재하지 않는 ID 삭제 시 404 반환")(
    async () => {
      await api.functional.attendance.admins.eraseById(connection, {
        id: nonExistentId,
      });
    },
  );
}