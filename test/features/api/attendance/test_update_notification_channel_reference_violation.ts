import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";

/**
 * 존재하지 않는 student_id/parent_id 또는 잘못된 channel_type 등 FK/enum constraint 위반 파라미터로 PUT 업데이트 시도 시, 422 에러가 반영되는지 검증한다.
 *
 * 이 테스트는 알림 채널(notification channel) 업데이트(putById)시 FK나 ENUM 등 제약조건 위반이 발생했을 때 서버가 422 Unprocessable Entity 또는 관련 validation 에러를 반환하는지 검증합니다.
 *
 * 1. 정상 notification channel을 생성 (POST)
 * 2. 임의(random)한 uuid로 존재하지 않는 student_id와/or parent_id를 조합하거나, 존재하지 않는 channel_type(예: 'invalid_type')
 *    등 referential constraint 위반 상황을 만든 뒤, putById로 업데이트를 시도한다.
 * 3. 422 Unprocessable Entity 혹은 validation 에러가 발생하는지 TestValidator.error로 검증한다.
 * 4. 여러 에러 상황 –
 *    a. 없는 student_id로 업데이트
 *    b. 없는 parent_id로 업데이트
 *    c. 형식 외 channel_type 전달 (e.g. 'invalid_type')
 *    d. (IUpdate 타입상 TestValidator.error로 시도할 수 있는 한계까지)
 */
export async function test_api_attendance_test_update_notification_channel_reference_violation(
  connection: api.IConnection,
) {
  // 1. 정상 notification channel을 우선 생성
  const created = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id: typia.random<string & tags.Format<"uuid">>(),
      parent_id: null,
      channel_type: "app_push",
      is_enabled: true,
      preference_order: 1,
    },
  });
  typia.assert(created);

  // 2.a. 존재하지 않는 student_id로 업데이트 시도
  await TestValidator.error("존재하지 않는 student_id로 업데이트시 422")(async () => {
    await api.functional.attendance.notificationChannels.putById(connection, {
      id: created.id,
      body: {
        student_id: typia.random<string & tags.Format<"uuid">>(),
      },
    });
  });

  // 2.b. 존재하지 않는 parent_id로 업데이트 시도
  await TestValidator.error("존재하지 않는 parent_id로 업데이트시 422")(async () => {
    await api.functional.attendance.notificationChannels.putById(connection, {
      id: created.id,
      body: {
        parent_id: typia.random<string & tags.Format<"uuid">>(),
      },
    });
  });

  // 2.c. 허용되지 않은 channel_type(enum이 아닌 값)으로 업데이트 시도
  await TestValidator.error("존재하지 않는 channel_type로 업데이트시 422")(async () => {
    await api.functional.attendance.notificationChannels.putById(connection, {
      id: created.id,
      body: {
        channel_type: "invalid_type",
      },
    });
  });

  // 2.d. 여러 필드 조합 (예: 없는 student_id+없는 parent_id 동시)
  await TestValidator.error("없는 student_id+parent_id 동시 업데이트시 422")(async () => {
    await api.functional.attendance.notificationChannels.putById(connection, {
      id: created.id,
      body: {
        student_id: typia.random<string & tags.Format<"uuid">>(),
        parent_id: typia.random<string & tags.Format<"uuid">>(),
      },
    });
  });
}