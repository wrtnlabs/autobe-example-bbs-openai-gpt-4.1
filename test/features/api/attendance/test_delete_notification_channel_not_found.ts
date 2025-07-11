import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";

/**
 * 존재하지 않는 알림 채널(PK: uuid)로 삭제 요청 시 404 not found 에러가 반환되는지 검증한다.
 *
 * 실제 존재하지 않는 uuid를 만들어 API에 삭제 요청을 보내고,
 * 서버가 올바르게 404 에러를 응답하는지 확인한다.
 * 이미 삭제된 채널 id 활용 역시 동일 동작을 보장한다.
 *
 * [테스트 절차]
 * 1. 무작위/임의의 uuid를 생성한다(이 uuid는 어떤 알림 채널에도 속하지 않는다).
 * 2. 해당 uuid로 notificationChannels.eraseById를 호출한다.
 * 3. 404 Not Found 에러를 반환하는지 TestValidator.error로 검증한다.
 * 4. 응답값이 없다면 테스트 통과로 처리한다(별도 타입 검증 불필요).
 */
export async function test_api_attendance_test_delete_notification_channel_not_found(
  connection: api.IConnection,
) {
  // 1. 무작위로 존재하지 않는 uuid 생성
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  // 2. 삭제 API 호출 후 404 에러 검증
  await TestValidator.error("존재하지 않는 알림 채널 삭제시 404 반환")(
    async () => {
      await api.functional.attendance.notificationChannels.eraseById(connection, {
        id: nonExistentId,
      });
    },
  );
}