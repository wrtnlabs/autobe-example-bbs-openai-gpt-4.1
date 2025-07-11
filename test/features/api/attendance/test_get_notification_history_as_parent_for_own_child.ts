import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotification";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";
import type { IAttendanceNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationHistory";

/**
 * 학부모가 자녀에 대한 notificationHistory 단건 조회 및 권한 체크 케이스 검증
 *
 * 본 테스트는 다음을 검증합니다.
 * - 학부모가 자신의 자녀에 대해 생성된 notificationHistory를 정상적으로 id로 조회할 수 있다.
 * - 다른 자녀에 대한 notificationHistory를 조회하려 하면 접근이 거부(403)되는지 확인한다.
 *
 * 테스트 절차:
 * 1. 부모1, 부모2 계정을 준비한다(실제 인증 API 제공 없으므로 UUID 수동 할당)
 * 2. 학생1(자녀1), 학생2(자녀2) UUID를 준비한다.
 * 3. 학생1-부모1, 학생2-부모2 쌍으로 알림채널을 각각 개설한다.
 * 4. 각 학생에 대해 attendanceNotification을 생성한다.
 * 5. 각 notification과 채널을 연결해 notificationHistory를 각각 생성한다.
 * 6. case1: 부모1이 자녀1의 notificationHistory를 정상적으로 id로 조회한다.
 * 7. case2: 부모1이 자녀2의 notificationHistory를 id로 조회하며 403/권한오류를 확인한다.
 */
export async function test_api_attendance_test_get_notification_history_as_parent_for_own_child(
  connection: api.IConnection,
) {
  // 1. 부모, 학생 UUID 2쌍 준비
  const parent1Id = typia.random<string & tags.Format<"uuid">>();
  const parent2Id = typia.random<string & tags.Format<"uuid">>();
  const student1Id = typia.random<string & tags.Format<"uuid">>();
  const student2Id = typia.random<string & tags.Format<"uuid">>();

  // 2. 각 학생마다 알림 채널 생성 (학부모 채널)
  const channel1 = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id: student1Id,
      parent_id: parent1Id,
      channel_type: "app_push",
      is_enabled: true,
      preference_order: 1,
    },
  });
  typia.assert(channel1);

  const channel2 = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id: student2Id,
      parent_id: parent2Id,
      channel_type: "app_push",
      is_enabled: true,
      preference_order: 1,
    },
  });
  typia.assert(channel2);

  // 3. 각 학생마다 notification(알림) 생성
  const notification1 = await api.functional.attendance.notifications.post(connection, {
    body: {
      attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
      student_id: student1Id,
      classroom_id: typia.random<string & tags.Format<"uuid">>(),
      event_type: "present",
      triggered_at: new Date().toISOString(),
      message_template: "출석 성공",
    },
  });
  typia.assert(notification1);

  const notification2 = await api.functional.attendance.notifications.post(connection, {
    body: {
      attendance_record_id: typia.random<string & tags.Format<"uuid">>(),
      student_id: student2Id,
      classroom_id: typia.random<string & tags.Format<"uuid">>(),
      event_type: "late",
      triggered_at: new Date().toISOString(),
      message_template: "지각",
    },
  });
  typia.assert(notification2);

  // 4. 각 학생에 대해 notificationHistory 생성
  const history1 = await api.functional.attendance.notificationHistories.post(connection, {
    body: {
      notification_id: notification1.id,
      channel_id: channel1.id,
      sent_at: new Date().toISOString(),
      status: "delivered",
    },
  });
  typia.assert(history1);

  const history2 = await api.functional.attendance.notificationHistories.post(connection, {
    body: {
      notification_id: notification2.id,
      channel_id: channel2.id,
      sent_at: new Date().toISOString(),
      status: "delivered",
    },
  });
  typia.assert(history2);

  // 5. [성공] 부모1 - 자녀1 알림 히스토리 단건 조회
  const read1 = await api.functional.attendance.notificationHistories.getById(connection, {
    id: history1.id,
  });
  typia.assert(read1);
  TestValidator.equals("history1 fetch, id match")(read1.id)(history1.id);

  // 6. [권한 오류] 부모1이 자녀2 기록에 잘못 접근 시 access denied(403)
  await TestValidator.error("부모1이 남의 자녀 기록 조회 시 403 오류")(
    async () => {
      await api.functional.attendance.notificationHistories.getById(connection, {
        id: history2.id,
      });
    },
  );
}