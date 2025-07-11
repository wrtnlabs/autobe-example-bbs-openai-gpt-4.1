import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotification";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";
import type { IAttendanceNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationHistory";

/**
 * 존재하지 않는 notification_id, channel_id와 중복 데이터 케이스에 대한 attendance_notification_history 생성 API의 validation 오류 검증
 *
 * 본 테스트는 실제 존재하는 notification, notification_channel을 준비해두고, 아래의 세 케이스를 체계적으로 검증합니다.
 *
 * 1. 존재하지 않는 notification_id 혹은 channel_id 값으로 notificationHistories.post 요청 → 422 에러
 * 2. 정상 notification_id, channel_id, sent_at 값으로 생성(정상 생성)
 * 3. 2번에서 사용한 (notification_id + channel_id + sent_at 값)으로 중복 생성 요청 → 409 에러 (unique 제약 위반)
 *
 * 각 케이스별로 올바른 결과(성공 및 status code 발생 여부)를 Assertion합니다.
 */
export async function test_api_attendance_test_create_notification_history_with_invalid_channel_id_or_duplicate(
  connection: api.IConnection,
) {
  // (1) notification 데이터 생성
  const notificationReq: api.functional.attendance.notifications.post.Body = {
    attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
    student_id: typia.random<string & tags.Format<"uuid">>(),
    teacher_id: null,
    classroom_id: typia.random<string & tags.Format<"uuid">>(),
    event_type: "present",
    triggered_at: new Date().toISOString(),
    message_template: "출석이 정상적으로 처리되었습니다.",
  };
  const notification = await api.functional.attendance.notifications.post(connection, {
    body: notificationReq,
  });
  typia.assert(notification);

  // (2) notification_channel 데이터 생성
  const notificationChannelReq: api.functional.attendance.notificationChannels.post.Body = {
    student_id: notification.student_id,
    parent_id: null,
    channel_type: "sms",
    is_enabled: true,
    preference_order: 1,
  };
  const channel = await api.functional.attendance.notificationChannels.post(connection, {
    body: notificationChannelReq,
  });
  typia.assert(channel);

  // ---- CASE 1 : 없는 notification_id/channel_id로 요청 시 422 error ------
  const invalidHistoryReq: api.functional.attendance.notificationHistories.post.Body = {
    notification_id: typia.random<string & tags.Format<"uuid">>(), // 실제 존재하지 않는 값
    channel_id: typia.random<string & tags.Format<"uuid">>(),      // 실제 존재하지 않는 값
    sent_at: new Date().toISOString(),
    delivered_at: null,
    status: "pending",
    error_message: null,
  };
  await TestValidator.error("존재하지 않는 notification/channel id 사용시 422 에러 반환")(
    async () => {
      await api.functional.attendance.notificationHistories.post(connection, {
        body: invalidHistoryReq,
      });
    },
  );

  // ---- CASE 2 : 정상 request로 한번 생성 -----
  const sentAt = new Date().toISOString();
  const validHistoryReq: api.functional.attendance.notificationHistories.post.Body = {
    notification_id: notification.id,
    channel_id: channel.id,
    sent_at: sentAt,
    delivered_at: sentAt,
    status: "delivered",
    error_message: null,
  };
  const history = await api.functional.attendance.notificationHistories.post(connection, {
    body: validHistoryReq,
  });
  typia.assert(history);
  TestValidator.equals("notification_id 일치")(history.notification_id)(notification.id);
  TestValidator.equals("channel_id 일치")(history.channel_id)(channel.id);
  TestValidator.equals("sent_at 일치")(history.sent_at)(sentAt);

  // ---- CASE 3 : 동일한(notification_id+channel_id+sent_at)로 중복 요청시 409 error -----
  await TestValidator.error("notification+channel+sent_at 중복 생성시 409 에러 반환")(
    async () => {
      await api.functional.attendance.notificationHistories.post(connection, {
        body: validHistoryReq,
      });
    },
  );
}