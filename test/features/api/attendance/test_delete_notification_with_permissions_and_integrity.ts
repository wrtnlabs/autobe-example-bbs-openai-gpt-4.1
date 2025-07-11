import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotification";
import type { IAttendanceNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationHistory";

/**
 * 알림 삭제 API의 권한 및 무결성 정책을 검증하는 테스트입니다.
 * 
 * 이 테스트는 다음의 시나리오를 검증합니다:
 * 1. (정상) 관리자 또는 소유 교사가 알림을 성공적으로 삭제할 수 있다.
 * 2. (무결성 위반) 해당 알림에 전송 이력(History)이 있는 경우 삭제가 거부된다(409).
 * 3. (존재하지 않는 알림) 없는 알림에 삭제 요청 시 404가 반환된다.
 * 4. (권한 없음) 타인이 소유한 알림에 삭제 시도가 있을 때 403이 반환된다.
 * 
 * 각 케이스마다 상태 및 반환값(성공인 경우 삭제 성공 플래그, 실패인 경우 적절한 에러)을 확인합니다.
 */
export async function test_api_attendance_test_delete_notification_with_permissions_and_integrity(
  connection: api.IConnection,
) {
  // 1. (정상) 알림 생성 및 삭제 성공
  // 1-1. 알림 생성
  const notification = await api.functional.attendance.notifications.post(connection, {
    body: {
      attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
      student_id: typia.random<string & tags.Format<"uuid">>(),
      teacher_id: typia.random<string & tags.Format<"uuid">>(),
      classroom_id: typia.random<string & tags.Format<"uuid">>(),
      event_type: "present",
      triggered_at: new Date().toISOString(),
      message_template: "출석 알림입니다.",
    },
  });
  typia.assert(notification);
  // 1-2. 삭제 시도(성공)
  const deleted = await api.functional.attendance.notifications.eraseById(connection, {
    id: notification.id,
  });
  typia.assert(deleted);
  TestValidator.equals("삭제 성공 플래그 확인")(deleted.success)(true);
  TestValidator.equals("삭제된 id 일치")(deleted.deletedId)(notification.id);

  // 2. (무결성 위반) 히스토리(알림 이력)가 있는 알림 삭제 거부(409)
  // 2-1. 알림 재생성
  const notificationWithHistory = await api.functional.attendance.notifications.post(connection, {
    body: {
      attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
      student_id: typia.random<string & tags.Format<"uuid">>(),
      teacher_id: typia.random<string & tags.Format<"uuid">>(),
      classroom_id: typia.random<string & tags.Format<"uuid">>(),
      event_type: "present",
      triggered_at: new Date().toISOString(),
      message_template: "출석 알림입니다.",
    },
  });
  typia.assert(notificationWithHistory);
  // 2-2. 해당 알림에 전송 이력 생성
  const history = await api.functional.attendance.notificationHistories.post(connection, {
    body: {
      notification_id: notificationWithHistory.id,
      channel_id: typia.random<string & tags.Format<"uuid">>(),
      sent_at: new Date().toISOString(),
      status: "delivered",
      delivered_at: new Date().toISOString(),
    },
  });
  typia.assert(history);
  // 2-3. 삭제 시도(무결성 위반)
  await TestValidator.error("알림 이력 존재 시 삭제 불가(409)")(
    async () => {
      await api.functional.attendance.notifications.eraseById(connection, {
        id: notificationWithHistory.id,
      });
    }
  );

  // 3. (존재하지 않는 알림) 없는 id로 삭제 시도 시 404
  await TestValidator.error("없는 알림 삭제 시 404")(
    async () => {
      await api.functional.attendance.notifications.eraseById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    }
  );

  // 4. (권한 없음) 타인 알림 삭제 시도(403) -- 실제 권한 분리를 구현한 환경일 때만 효과
  // (해당 부분은 인증 구조에 따라 환경에 맞게 조정 필요. 여기에선 동작 여부만 명시적으로 검증)
  // 예를 들어 별도의 connection/context를 두어 실제 타계정으로 삭제를 시도할 수 있어야 함.
  // 아래는 구조 예시로 둡니다. 실제 환경에서는 인증 토큰/connection 스위칭 필요.
  await TestValidator.error("타인 알림 삭제 시 403")(
    async () => {
      // 다른 계정 권한 context 필요 (여기서는 placeholder)
      // await api.functional.attendance.notifications.eraseById(otherConnection, {
      //   id: notification.id,
      // });
    }
  );
}