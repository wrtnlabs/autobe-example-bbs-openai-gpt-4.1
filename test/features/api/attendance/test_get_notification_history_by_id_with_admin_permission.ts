import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotification";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";
import type { IAttendanceNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationHistory";

/**
 * 관리자 권한으로 알림(notification) 히스토리 단건을 id(PK)로 조회하는 API의 E2E 테스트.
 *
 * 이 테스트는 다음을 검증합니다:
 * 1. 실제 존재하는 notificationHistories의 id를 관리자 권한으로 조회 시 모든 주요 필드(채널, 상태, timestamp, 에러메시지, notification_id 등)가 정상적으로 반환되는지
 * 2. 존재하지 않는 id로 접근했을 때 404 에러가 반환되는지
 * 3. 권한 없는 사용자가 접근했을 때 403 에러가 반환되는지
 *
 * Step-by-step:
 * 1. notification을 생성한다 (알림 이벤트)
 * 2. notification channel을 생성한다 (이벤트 연결 채널)
 * 3. notificationHistories(이력)을 생성한다 (위 notification과 channel로 연결)
 * 4. 생성된 이력 id로 notificationHistories.getById를 호출하여 상세 데이터를 가져옴 - 모든 필드의 무결성 검증
 * 5. 존재하지 않는 id(PK)로 조회 시도 → 404 반환 기대(TestValidator.error)
 * 6. (가정) 권한 없는 사용자로 토큰을 교체 후 동일 데이터 조회 시도 → 403 반환 기대(TestValidator.error)
 */
export async function test_api_attendance_test_get_notification_history_by_id_with_admin_permission(connection: api.IConnection) {
  // 1. notification을 생성한다
  const notification = await api.functional.attendance.notifications.post(connection, {
    body: {
      attendance_record_id: typia.random<string & tags.Format<'uuid'>>(),
      student_id: typia.random<string & tags.Format<'uuid'>>(),
      teacher_id: null,
      classroom_id: typia.random<string & tags.Format<'uuid'>>(),
      event_type: 'present',
      triggered_at: new Date().toISOString(),
      message_template: RandomGenerator.paragraph()(),
    } satisfies IAttendanceNotification.ICreate,
  });
  typia.assert(notification);

  // 2. notification channel을 생성한다
  const channel = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id: notification.student_id,
      parent_id: null,
      channel_type: 'sms',
      is_enabled: true,
      preference_order: 1,
    } satisfies IAttendanceNotificationChannel.ICreate,
  });
  typia.assert(channel);

  // 3. notificationHistory 생성
  const history = await api.functional.attendance.notificationHistories.post(connection, {
    body: {
      notification_id: notification.id,
      channel_id: channel.id,
      sent_at: new Date().toISOString(),
      delivered_at: null,
      status: 'pending',
      error_message: null,
    } satisfies IAttendanceNotificationHistory.ICreate,
  });
  typia.assert(history);

  // 4. 정상 조회: 생성된 이력 id로 상세 데이터 확인
  const detail = await api.functional.attendance.notificationHistories.getById(connection, { id: history.id });
  typia.assert(detail);
  TestValidator.equals('notification_id')(detail.notification_id)(notification.id);
  TestValidator.equals('channel_id')(detail.channel_id)(channel.id);
  TestValidator.equals('status')(detail.status)('pending');

  // 필드 무결성 추가 확인
  TestValidator.equals('sent_at')(detail.sent_at)(history.sent_at);
  TestValidator.equals('delivered_at')(detail.delivered_at)(history.delivered_at);
  TestValidator.equals('error_message')(detail.error_message)(history.error_message);

  // 5. 존재하지 않는 id → 404 Not Found 에러 확인
  await TestValidator.error('존재하지 않는 id 조회시 404')(() =>
    api.functional.attendance.notificationHistories.getById(connection, {
      id: typia.random<string & tags.Format<'uuid'>>(),
    }),
  );

  // 6. (옵션) 권한 없는 사용자의 권한에서 접근하는 경우 403 반환 체크 (connection이 실제 인증 context를 반영한다고 가정)
  // ※ 실 시스템에서는 connection 객체를 사용자별로 바꿔주는 별도의 인증/로그인 API를 호출해 전환해야 합니다.
  // 이 예제에서는 별도의 비관리자 connection이 있다면 아래 코드 수행, 그렇지 않을 경우 코멘트 아웃 처리.
  // const userConnection = await getNonAdminUserConnection();
  // await TestValidator.error('권한 없는 접근 시도시 403')(() =>
  //   api.functional.attendance.notificationHistories.getById(userConnection, {
  //     id: history.id,
  //   }),
  // );
}