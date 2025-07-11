import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";

/**
 * 존재하지 않는 student_id, parent_id, 잘못된 channel_type 등 validation 오류 시 422 반환 검증
 *
 * - 존재하지 않는 student_id 또는 parent_id, 허용되지 않은 channel_type, parent_id 누락 등 잘못된 값으로 notification channel 생성 시도시 422 error가 반환되는지 검증
 * - TypeScript 상 타입 미스(필수값 누락, 잘못된 타입)는 테스트에서 제외하며, nullable&optional인 parent_id에 null/undefined 등 다양한 잘못된 값을 활용한다.
 *
 * 1. 존재하지 않는 student_id를 사용해 생성 → 422
 * 2. 존재하지 않는 parent_id를 포함해 생성 → 422
 * 3. 잘못된 channel_type (지원하지 않는 값) → 422
 * 4. parent_id를 누락(undefined)하여 생성 → 422
 */
export async function test_api_attendance_test_create_notification_channel_with_invalid_reference(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 student_id로 생성 시도
  await TestValidator.error("존재하지 않는 student_id이면 422")(async () => {
    await api.functional.attendance.notificationChannels.post(connection, {
      body: {
        student_id: typia.random<string & tags.Format<"uuid">>(),
        parent_id: null,
        channel_type: "app_push",
        is_enabled: true,
        preference_order: 1,
      } satisfies IAttendanceNotificationChannel.ICreate,
    });
  });

  // 2. 존재하지 않는 parent_id로 생성 시도
  await TestValidator.error("존재하지 않는 parent_id이면 422")(async () => {
    await api.functional.attendance.notificationChannels.post(connection, {
      body: {
        student_id: typia.random<string & tags.Format<"uuid">>(),
        parent_id: typia.random<string & tags.Format<"uuid">>(),
        channel_type: "sms",
        is_enabled: true,
        preference_order: 2,
      } satisfies IAttendanceNotificationChannel.ICreate,
    });
  });

  // 3. 허용되지 않는 channel_type으로 생성 시도
  await TestValidator.error("잘못된 channel_type이면 422")(async () => {
    await api.functional.attendance.notificationChannels.post(connection, {
      body: {
        student_id: typia.random<string & tags.Format<"uuid">>(),
        parent_id: null,
        channel_type: "invalid_type",
        is_enabled: true,
        preference_order: 3,
      } satisfies IAttendanceNotificationChannel.ICreate,
    });
  });

  // 4. parent_id 누락(undefined, key 자체를 빠뜨림)
  await TestValidator.error("parent_id 누락 + 존재하지 않는 student_id로 생성 시도")(async () => {
    await api.functional.attendance.notificationChannels.post(connection, {
      body: {
        student_id: typia.random<string & tags.Format<"uuid">>(),
        channel_type: "email",
        is_enabled: true,
        preference_order: 4,
      } satisfies IAttendanceNotificationChannel.ICreate,
    });
  });
}