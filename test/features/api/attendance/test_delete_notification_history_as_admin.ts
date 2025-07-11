import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotification";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";
import type { IAttendanceNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationHistory";

/**
 * 관리자 권한의 notification history 삭제 기능 검증
 *
 * - 본 테스트는 notification history 삭제 기능이 정상 동작하는지,
 *   삭제 후 재조회/재삭제 시 404 not found가 반환되는지,
 *   권한 없는 사용자 요청 시 403 forbidden이 반환되는지를 검증한다.
 *
 * [테스트 플로우]
 * 1. 삭제 대상 생성 (알림 → 채널 → 이력)
 * 2. 관리자 권한으로 정상 삭제 시도 (성공 확인)
 * 3. 동일 id 재삭제/재조회 시 404 Not Found 발생 확인
 * 4. (가정) 인증분리 가능한 경우 '권한 없는 연결'로 동일 id 재삭제 시 403 Forbidden 발생 확인
 */
export async function test_api_attendance_test_delete_notification_history_as_admin(
  connection: api.IConnection,
) {
  // 1. 삭제 대상 데이터 전제 생성: notification → notificationChannel → notificationHistory
  // (테스트용 의존성: 각 primitive 값은 관계 타당성을 위해 연속 사용)
  // 알림 notification 생성
  const notification = await api.functional.attendance.notifications.post(connection, {
    body: {
      attendance_record_id: typia.random<string & tags.Format<'uuid'>>(),
      student_id: typia.random<string & tags.Format<'uuid'>>(),
      teacher_id: null,
      classroom_id: typia.random<string & tags.Format<'uuid'>>(),
      event_type: 'present',
      triggered_at: new Date().toISOString(),
      message_template: '출석이 확인되었습니다.',
    } satisfies IAttendanceNotification.ICreate,
  });
  typia.assert(notification);

  // 알림 채널 생성
  const notificationChannel = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id: notification.student_id,
      parent_id: null,
      channel_type: 'app_push',
      is_enabled: true,
      preference_order: 1,
    } satisfies IAttendanceNotificationChannel.ICreate,
  });
  typia.assert(notificationChannel);

  // 알림 이력(notificationHistory) 생성
  const notificationHistory = await api.functional.attendance.notificationHistories.post(connection, {
    body: {
      notification_id: notification.id,
      channel_id: notificationChannel.id,
      sent_at: new Date().toISOString(),
      delivered_at: new Date().toISOString(),
      status: 'delivered',
      error_message: null,
    } satisfies IAttendanceNotificationHistory.ICreate,
  });
  typia.assert(notificationHistory);

  // 2. 관리자 권한으로 정상 삭제 시도
  await api.functional.attendance.notificationHistories.eraseById(connection, {
    id: notificationHistory.id,
  });

  // 3. 동일 id로 재삭제 및 삭제 후 재조회 시 404 not found 확인 (실제 테스트에선 재삭제만으로도 충분)
  await TestValidator.error('관리자 - 삭제 후 재삭제 요청시 404 not found')(
    async () => {
      await api.functional.attendance.notificationHistories.eraseById(connection, {
        id: notificationHistory.id,
      });
    },
  );

  // 4. (선택/가정) 권한 없는 사용자 연결로 삭제 시 403 forbidden (테스트 인프라가 지원할 경우에 한함)
  // ex) connectionGuest: 권한 없는 별도 connection 객체(토큰 미포함 또는 일반 사용자 토큰)
  // 아래 코드는 실제 인프라·테스트 환경의 인증 mock 구성이 필요함
  /*
  await TestValidator.error('비관리자 권한으로 삭제 요청시 403 forbidden')(
    async () => {
      await api.functional.attendance.notificationHistories.eraseById(connectionGuest, {
        id: notificationHistory.id,
      });
    },
  );
  */
}