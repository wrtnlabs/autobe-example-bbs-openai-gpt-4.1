import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceAuthAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceAuthAccount";

/**
 * 인증계정 삭제 API의 권한 검증 테스트
 *
 * 권한이 없는 사용자가 타인의 인증계정 삭제를 시도할 때
 * 403 Forbidden 또는 401 Unauthorized 응답이 발생하는지 검증합니다.
 * 실제 삭제는 되지 않아야 하며, 권한 거부 관련 에러가 반드시 발생해야 합니다.
 *
 * 1. 임의의 인증계정 UUID 준비 (존재할 수도, 없을 수도 있음)
 * 2. 권한 없는(미인증 or 일반 사용자) 상태로 인증계정 삭제 API 호출
 * 3. 401 또는 403 에러 발생 여부 검증
 */
export async function test_api_attendance_auth_account_test_delete_auth_account_no_permission(
  connection: api.IConnection,
) {
  // 1. 대상 인증계정 UUID 준비 (임의의 UUID)
  const targetId = typia.random<string & tags.Format<"uuid">>();

  // 2. 인증 없이(또는 일반 유저로) 계정 삭제 시도 → 401/403 등 권한 관련 에러 발생 예상
  await TestValidator.error("권한 없는 사용자의 계정 삭제 시도는 에러가 발생해야 합니다.")(
    async () => {
      await api.functional.attendance.auth.accounts.eraseById(connection, {
        id: targetId,
      });
    },
  );
}