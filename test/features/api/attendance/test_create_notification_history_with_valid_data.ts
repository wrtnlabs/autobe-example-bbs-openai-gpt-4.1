import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotification";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";
import type { IAttendanceNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationHistory";

/**
 * 알림 발송 이력(notificationHistories) 생성 정상 케이스 검증
 *
 * 이 테스트는 다음을 점검합니다:
 * - 올바르게 참조되는 알림(notification)과 알림 채널(notificationChannel) 데이터를 준비한 후,
 * - 정합성 있는 sent_at(발송 시각)과 상태(status) 필드 값을 활용해 알림 전송 이력(notificationHistory)을 생성할 때 정상적으로 DB에 이력이 생성되는지 검증
 * - 이 때 FK 제약(참조 무결성)이 정확히 지켜지는지 사전 데이터를 통한 확인
 *
 * [테스트 절차]
 * 1. 임의의 attendance_record_id, student_id, classroom_id 등 필수 필드로 notification 엔티티 생성
 * 2. 동일한 student_id를 활용해 notification_channel 엔티티 생성
 * 3. 위 두 객체를 참조하여 notification_history(post) 요청 수행
 * 4. 응답 값에서 notification_id, channel_id 등이 사전 생성한 id와 정확히 일치하고, sent_at/status 등 요청 값과 실제 이력이 정상 생성되는지 assert
 */
export async function test_api_attendance_test_create_notification_history_with_valid_data(
  connection: api.IConnection,
) {
  // 1. 알림(notification) 생성
  const notification = await api.functional.attendance.notifications.post(connection, {
    body: {
      attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
      student_id: typia.random<string & tags.Format<"uuid">>(),
      teacher_id: null,
      classroom_id: typia.random<string & tags.Format<"uuid">>(),
      event_type: "present",
      triggered_at: typia.random<string & tags.Format<"date-time">>(),
      message_template: "[출석 알림] {{student}} 학생이 {{event}} 처리되었습니다.",
    } satisfies IAttendanceNotification.ICreate,
  });
  typia.assert(notification);

  // 2. 알림 채널(notificationChannel) 생성 (같은 student_id 활용)
  const notificationChannel = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id: notification.student_id,
      parent_id: null,
      channel_type: "sms",
      is_enabled: true,
      preference_order: 1,
    } satisfies IAttendanceNotificationChannel.ICreate,
  });
  typia.assert(notificationChannel);

  // 3. 알림 전송 이력(NotificationHistory) 생성
  const sent_at = typia.random<string & tags.Format<"date-time">>();
  const status = "pending";
  const notificationHistory = await api.functional.attendance.notificationHistories.post(connection, {
    body: {
      notification_id: notification.id,
      channel_id: notificationChannel.id,
      sent_at,
      status,
    } satisfies IAttendanceNotificationHistory.ICreate,
  });
  typia.assert(notificationHistory);

  // 4. 사전 참조 데이터와 응답 필드 값 검증
  TestValidator.equals("notification_id 일치")(notificationHistory.notification_id)(notification.id);
  TestValidator.equals("channel_id 일치")(notificationHistory.channel_id)(notificationChannel.id);
  TestValidator.equals("sent_at 일치")(notificationHistory.sent_at)(sent_at);
  TestValidator.equals("status 일치")(notificationHistory.status)(status);
}