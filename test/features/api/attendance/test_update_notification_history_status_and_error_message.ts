import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotification";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";
import type { IAttendanceNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationHistory";

/**
 * 알림 전송 이력(notification history)의 상태(status) 및 에러 메시지(error_message) 수정 및 validation 테스트
 *
 * 이 테스트는 다음과 같은 실제 업무 플로우와 검증을 수행합니다.
 *
 * 1. 알림(notification) 객체를 생성한다.
 * 2. 알림 채널(notification channel) 객체를 생성한다. (notification의 student_id 등 참조)
 * 3. 알림 이력(notification history) 객체를 생성한다. (notification, channel 참조)
 * 4. status, error_message 필드 일부/전체 정상 업데이트 후 변경값이 반영되는지 getById 결과로 검증한다.
 * 5. 불가한 status transition 요청시 422(Unprocessable Entity) 등 적절한 에러가 발생하는지 검증한다.
 * 6. 존재하지 않는 history id 접근 시 에러(404 등)도 검증한다.
 */
export async function test_api_attendance_test_update_notification_history_status_and_error_message(
  connection: api.IConnection,
) {
  // 1. 알림(notification) 객체 생성
  const notification = await api.functional.attendance.notifications.post(connection, {
    body: {
      attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
      student_id: typia.random<string & tags.Format<"uuid">>(),
      teacher_id: null,
      classroom_id: typia.random<string & tags.Format<"uuid">>(),
      event_type: "present",
      triggered_at: new Date().toISOString(),
      message_template: "[출석알림] {student}님 등교 처리됨.",
    } satisfies IAttendanceNotification.ICreate,
  });
  typia.assert(notification);

  // 2. 알림 채널(notification channel) 생성
  const channel = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id: notification.student_id,
      parent_id: null,
      channel_type: "sms",
      is_enabled: true,
      preference_order: 1,
    } satisfies IAttendanceNotificationChannel.ICreate,
  });
  typia.assert(channel);

  // 3. 알림 이력(notification history) 생성
  const history = await api.functional.attendance.notificationHistories.post(connection, {
    body: {
      notification_id: notification.id,
      channel_id: channel.id,
      sent_at: new Date().toISOString(),
      delivered_at: null,
      status: "pending",
      error_message: null,
    } satisfies IAttendanceNotificationHistory.ICreate,
  });
  typia.assert(history);

  // 4. 정상 status, error_message 업데이트
  const updated = await api.functional.attendance.notificationHistories.putById(connection, {
    id: history.id,
    body: {
      status: "delivered",
      error_message: null,
      delivered_at: new Date().toISOString(),
    } satisfies IAttendanceNotificationHistory.IUpdate,
  });
  typia.assert(updated);

  // 4-1. 실제로 업데이트 반영 여부 field 값 확인
  TestValidator.equals("status update 반영됨")(updated.status)("delivered");
  TestValidator.equals("error_message null 변경 확인")(updated.error_message)(null);
  TestValidator.predicate("delivered_at 값 업데이트됨")(
    typeof updated.delivered_at === "string" && updated.delivered_at !== null,
  );

  // 5. 불가한 status transition: delivered → pending 등 불가 transition 테스트 (422)
  await TestValidator.error("불가한 status transition시 422 에러")(
    async () => {
      await api.functional.attendance.notificationHistories.putById(connection, {
        id: history.id,
        body: {
          status: "pending",
        } satisfies IAttendanceNotificationHistory.IUpdate,
      });
    },
  );

  // 6. 존재하지 않는 id로 접근할 때(404 등)
  await TestValidator.error("존재하지 않는 history id 접근시 404")(
    async () => {
      await api.functional.attendance.notificationHistories.putById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "delivered",
        } satisfies IAttendanceNotificationHistory.IUpdate,
      });
    },
  );
}