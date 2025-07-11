import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";

/**
 * 동일 (student_id, parent_id, channel_type) 조합 중복 위반 PUT 시도 시 409 오류 검증
 *
 * 1. (studentA, parentA, channel_typeA)로 notification channel을 생성한다.
 * 2. (studentB, parentB, channel_typeB)로 notification channel을 생성한다.
 * 3. 두 번째 채널(channel2)의 id 값을 가진 레코드를 첫 번째 채널의 (student_id, parent_id, channel_type)로 PUT 시도한다.
 *    즉, id=channel2.id, body={ student_id: channel1.student_id, parent_id: channel1.parent_id, channel_type: channel1.channel_type }
 * 4. 이 시도에서 409 Conflict(중복 unique key 위반) 오류가 발생하는지 검증한다.
 */
export async function test_api_attendance_test_update_notification_channel_duplicate_violation(
  connection: api.IConnection,
) {
  // 1. (studentA, parentA, channel_typeA) 조합으로 알림 채널 생성
  const studentA = typia.random<string & tags.Format<"uuid">>();
  const parentA = typia.random<string & tags.Format<"uuid">>();
  const channelTypeA = "app_push";
  const channel1 = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id: studentA,
      parent_id: parentA,
      channel_type: channelTypeA,
      is_enabled: true,
      preference_order: 1,
    },
  });
  typia.assert(channel1);
  
  // 2. (studentB, parentB, channel_typeB) 조합으로 두 번째 알림 채널 생성
  let studentB = typia.random<string & tags.Format<"uuid">>();
  let parentB = typia.random<string & tags.Format<"uuid">>();
  let channelTypeB = "sms";
  const channel2 = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id: studentB,
      parent_id: parentB,
      channel_type: channelTypeB,
      is_enabled: true,
      preference_order: 2,
    },
  });
  typia.assert(channel2);

  // 3. 두 번째 채널을 첫 번째 채널의 조합으로 PUT 시도
  await TestValidator.error("중복 (student_id, parent_id, channel_type) PUT 시 409 오류 발생")(
    async () => {
      await api.functional.attendance.notificationChannels.putById(connection, {
        id: channel2.id,
        body: {
          student_id: channel1.student_id,
          parent_id: channel1.parent_id ?? null,
          channel_type: channel1.channel_type,
        },
      });
    },
  );
}