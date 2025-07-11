import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAdmin";

/**
 * 존재하지 않는 관리자를 수정 시 404 Not Found 오류가 발생하는지 테스트
 *
 * - 존재하지 않는 UUID를 id로 사용하여 관리자 정보 수정 API 요청
 * - 정상 body로 요청해도, 존재하지 않는 id로 인해 Not Found 오류가 반드시 발생해야 함
 * - 오류가 발생하지 않고 객체가 반환되면 이는 API 버그
 *
 * [테스트 절차]
 * 1. 존재하지 않는 임의 UUID 생성
 * 2. IAttendanceAdmin.IUpdate 타입 임의 값으로 body 생성
 * 3. putById API 호출 시 반드시 오류가 발생해야 함
 * 4. 오류 발생 확인, 오류 없으면 실패
 */
export async function test_api_attendance_test_update_admin_info_with_invalid_id(
  connection: api.IConnection,
) {
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  const testBody = typia.random<IAttendanceAdmin.IUpdate>();

  await TestValidator.error("존재하지 않는 id 수정 시 오류가 발생해야 함")(
    async () => {
      await api.functional.attendance.admins.putById(connection, {
        id: invalidId,
        body: testBody,
      });
    },
  );
}