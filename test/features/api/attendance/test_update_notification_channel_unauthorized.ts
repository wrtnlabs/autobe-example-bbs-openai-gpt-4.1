import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";

/**
 * 권한이 없는 타인이 notification channel을 임의로 수정할 때 403 Forbidden이 발생하는지 검증한다.
 *
 * ⚠️ 주의: 현재 제공된 API/테스트 환경에서는 세션/계정 분리를 통한 "타인 소유 리소스 접근" 구현이 불가합니다.
 * 즉, 테스트 connection으로 notification channel을 직접 생성한 뒤, 동일 connection으로 수정(put) 요청만 가능.
 * 실제 권한 분리/다중 계정 세션 제공 API가 필요하여 본 테스트 목적을 완전히 달성할 수 없습니다.
 */
export async function test_api_attendance_test_update_notification_channel_unauthorized(
  connection: api.IConnection,
) {
  // 1. notification channel 생성 (자신의 계정으로)
  const channelCreateInput = {
    student_id: typia.random<string & tags.Format<"uuid">>(),
    parent_id: typia.random<string & tags.Format<"uuid">>(),
    channel_type: "sms",
    is_enabled: true,
    preference_order: 1,
  } satisfies IAttendanceNotificationChannel.ICreate;

  const notificationChannel = await api.functional.attendance.notificationChannels.post(connection, {
    body: channelCreateInput,
  });
  typia.assert(notificationChannel);

  // 2. 동일 connection으로 PUT (타인 권한 시뮬레이션 불가)
  // 실제 타인 소유 notification channel 접근 시 403 forbidden 확인하려면 별도 세션/계정 분리가 필요함
}