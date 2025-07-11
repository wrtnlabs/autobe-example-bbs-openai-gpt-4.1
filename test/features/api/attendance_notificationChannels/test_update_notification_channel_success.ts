import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";

/**
 * 알림 수신 채널(AttendanceNotificationChannel) 정보를 수정(PUT)하는 시나리오 테스트
 *
 * - 본인 또는 관리자가 접근 가능한 notification channel(알림 채널)의 일부 필드 값을 수정(PUT) 요청할 때,
 *   정상적으로 업데이트되고 변경된 내용이 반환되는지 검증한다.
 * - 사전에는 POST를 통해 데이터(채널)를 생성해 id 값을 확보한 뒤, 해당 id로 수정(PUT) 시나리오를 수행한다.
 *
 * [테스트 시나리오]
 * 1. (사전) 알림 채널 등록: 임의의 student_id, parent_id, channel_type, is_enabled, preference_order 값으로 채널 생성
 * 2. 일부 필드 값(예: is_enabled 상태, channel_type, preference_order) 변경 요청
 * 3. PUT API 응답에 변경 사항이 실제 반영되어 반환되는지 검증 (is_enabled, channel_type, preference_order 값이 수정되었는지)
 * 4. 변경 전/후 데이터 비교를 통해 필드값 변경이 정상적으로 이뤄졌음을 assert
 */
export async function test_api_attendance_notificationChannels_test_update_notification_channel_success(
  connection: api.IConnection,
) {
  // 1. (사전) notification channel 생성
  const createInput: IAttendanceNotificationChannel.ICreate = {
    student_id: typia.random<string & tags.Format<"uuid">>(),
    parent_id: typia.random<string & tags.Format<"uuid">>(),
    channel_type: "app_push",
    is_enabled: true,
    preference_order: 1,
  };
  const original = await api.functional.attendance.notificationChannels.post(connection, { body: createInput });
  typia.assert(original);

  // 2. 일부 필드값 수정 요청 (is_enabled, channel_type, preference_order)
  const updateInput: IAttendanceNotificationChannel.IUpdate = {
    is_enabled: !original.is_enabled,
    channel_type: original.channel_type === "app_push" ? "sms" : "app_push",
    preference_order: original.preference_order + 1,
  };
  const updated = await api.functional.attendance.notificationChannels.putById(connection, {
    id: original.id,
    body: updateInput,
  });
  typia.assert(updated);

  // 3. 응답 필드 값이 실제로 변경되었는지 검증
  TestValidator.notEquals("is_enabled 필드 업데이트 확인")(original.is_enabled)(updated.is_enabled);
  TestValidator.notEquals("channel_type 필드 업데이트 확인")(original.channel_type)(updated.channel_type);
  TestValidator.notEquals("preference_order 필드 업데이트 확인")(original.preference_order)(updated.preference_order);
  // 4. 나머지 미수정 필드는 그대로인지 검증
  TestValidator.equals("student_id 변동 없음")(original.student_id)(updated.student_id);
  TestValidator.equals("parent_id 변동 없음")(original.parent_id)(updated.parent_id);
}