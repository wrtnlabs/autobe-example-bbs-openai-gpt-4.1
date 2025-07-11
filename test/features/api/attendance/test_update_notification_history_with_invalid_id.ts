import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationHistory";

/**
 * 존재하지 않는 알림 이력 id로 put 요청 시 404 에러, 권한 없는 사용자가 put 시도 시 403 에러가 발생하는지 검증.
 *
 * - 리소스가 실제 존재하지 않는 임의의 UUID를 사용하여 PUT 요청 시 404 Not Found 에러가 발생하는지 확인합니다.
 * - 권한 없는 사용자의 에러 검증 시나리오는 별도의 인증·권한 관리 API가 주어지는 경우에만 구현 가능합니다.
 * - 본 코드는 주어진 자료만으로는 권한 검증용 계정 생성 및 사용자 스위칭 등의 추가 API가 없으므로, 404 Not Found 케이스만 검증합니다.
 *
 * @details
 * 1. 존재하지 않는 UUID로 put 요청
 *    - 임의의 UUID와 update body를 생성해 PUT 요청을 수행
 *    - TestValidator.error로 예외 발생(404) 확인
 * 2. (자료 부족으로 생략) 권한 없는 사용자 put 요청
 */
export async function test_api_attendance_notificationHistories_putById_test_update_notification_history_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 알림 이력 id로 put 요청 (404 Not Found)
  await TestValidator.error("존재하지 않는 notificationHistory id로 put 요청 시 404 에러")(async () => {
    await api.functional.attendance.notificationHistories.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IAttendanceNotificationHistory.IUpdate>()
    });
  });
  // 2. (생략) 권한 없는 사용자의 403 Forbidden 케이스는 인증/권한 API 제공 시만 구현 가능
}