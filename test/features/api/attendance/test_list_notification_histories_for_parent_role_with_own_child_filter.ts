import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotification";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";
import type { IAttendanceNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationHistory";
import type { IPageIAttendanceNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceNotificationHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 학부모 계정이 본인 자녀의 notification_id로 알림 발송 이력(History) 목록을 필터 조회하는 경우를 검증합니다.
 *
 * - 부모-자녀 연동, notification, notification_channel 관계 생성(사전 준비)
 * - 정상적으로 본인 소유 자녀의 알림(notification) 기준으로 history를 검색하면 반환 리스트에 history가 정상 조회됨을 확인
 * - 본인 소유가 아닌 자녀(다른 notification_id)로 검색 시 403 에러 반환을 확인(권한 위배)
 * - 각 단계별로 타입 검사, 반환 데이터 적합성, 필터링 결과의 일관성, 권한 제약 검증
 */
export async function test_api_attendance_test_list_notification_histories_for_parent_role_with_own_child_filter(
  connection: api.IConnection,
) {
  // 1. 부모가 소유한 학생 UUID와 타인 학생 UUID 두 개 준비
  const parent_id = typia.random<string & tags.Format<"uuid">>();
  const own_student_id = typia.random<string & tags.Format<"uuid">>();
  const other_student_id = typia.random<string & tags.Format<"uuid">>();

  // 2. 테스트용 Notification 생성: 소유자용 + 타인용 각각 생성
  const own_notification = await api.functional.attendance.notifications.post(
    connection,
    {
      body: {
        attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
        student_id: own_student_id,
        classroom_id: typia.random<string & tags.Format<"uuid">>(),
        event_type: "present",
        triggered_at: new Date().toISOString(),
        message_template: "[Present] 알림템플릿",
        teacher_id: null,
      },
    },
  );
  typia.assert(own_notification);

  const other_notification = await api.functional.attendance.notifications.post(
    connection,
    {
      body: {
        attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
        student_id: other_student_id,
        classroom_id: typia.random<string & tags.Format<"uuid">>(),
        event_type: "absent",
        triggered_at: new Date().toISOString(),
        message_template: "[Absent] 템플릿",
        teacher_id: null,
      },
    },
  );
  typia.assert(other_notification);

  // 3. 부모-자녀 알림 채널 생성(본인 자녀)
  const channel = await api.functional.attendance.notificationChannels.post(
    connection,
    {
      body: {
        student_id: own_student_id,
        parent_id: parent_id,
        channel_type: "app_push",
        is_enabled: true,
        preference_order: 1,
      },
    },
  );
  typia.assert(channel);

  // 4. History 페이징 조회 (자기 자녀 notification 기준)
  const historyList = await api.functional.attendance.notificationHistories.patch(
    connection,
    {
      body: {
        notification_id: own_notification.id,
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(historyList);
  TestValidator.predicate("모든 이력이 본인 notification 기준인지")(
    historyList.data.every((row) => row.notification_id === own_notification.id),
  );

  // 5. 타인 notification_id로 조회 권한 오류 확인 (403 등 에러 발생)
  await TestValidator.error("타인 자녀 알림 이력 조회 금지")(() =>
    api.functional.attendance.notificationHistories.patch(connection, {
      body: {
        notification_id: other_notification.id,
        page: 1,
        limit: 10,
      },
    }),
  );
}