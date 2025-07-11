import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";
import type { IPageIAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceNotificationChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 알림 채널 목록 검색 필터 validation 실패 케이스 검증
 *
 * 사용자가 /attendance/notificationChannels API에 필터(검색조건) 요청을 보낼 때, 각 필드에 대해 실제 스키마에서 허용하지 않는 값·타입·범위를 지정했을 경우 422 validation error가 올바르게 반환되는지 점검한다.
 *
 * 커버 범위:
 * 1. student_id, parent_id의 UUID 형식 위반
 * 2. channel_type에 허용되지 않은 임의 문자열
 * 3. is_enabled에 boolean이 아닌 숫자/문자
 * 4. preference_order의 int32 범위 초과/미만 값
 * 5. page, limit의 0 이하값, 범위 초과
 * 6. sort_by, sort_order에 허용 타입 초과(숫자, 배열, 객체 등)
 * 7. 각 필드에 불가 타입(배열/객체 등) 전달
 *
 * 실제 제약조건에 맞는 다양한 validation 실패 시나리오별로 422 error가 발생하는지 검증한다.
 */
export async function test_api_attendance_test_list_notification_channels_invalid_filter_validation(
  connection: api.IConnection,
) {
  // 1. student_id, parent_id: 잘못된 UUID 전달
  await TestValidator.error("invalid student_id type")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { student_id: "not-a-uuid" } as any,
    })
  );
  await TestValidator.error("invalid parent_id type")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { parent_id: "not-a-uuid" } as any,
    })
  );

  // 2. channel_type: 임의의 허용되지 않는 값
  await TestValidator.error("invalid channel_type value")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { channel_type: "invalid_type" },
    })
  );

  // 3. is_enabled: boolean 아닌 타입
  await TestValidator.error("is_enabled wrong type (number)")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { is_enabled: 123 as any },
    })
  );
  await TestValidator.error("is_enabled wrong type (string)")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { is_enabled: "yes" as any },
    })
  );

  // 4. preference_order: int32 범위 violation
  await TestValidator.error("preference_order overflow")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { preference_order: 2147483648 as any },
    })
  );
  await TestValidator.error("preference_order underflow")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { preference_order: -2147483649 as any },
    })
  );

  // 5. page, limit: 0이하/초과값
  await TestValidator.error("page 0 invalid")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { page: 0 as any },
    })
  );
  await TestValidator.error("limit 0 invalid")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { limit: 0 as any },
    })
  );
  await TestValidator.error("page overflow")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { page: 2147483648 as any },
    })
  );
  await TestValidator.error("limit overflow")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { limit: 2147483648 as any },
    })
  );

  // 6. sort_by, sort_order: 타입 위반(숫자 등)
  await TestValidator.error("sort_by wrong type (number)")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { sort_by: 1 as any },
    })
  );
  await TestValidator.error("sort_order wrong type (object)")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { sort_order: {} as any },
    })
  );

  // 7. 각 필드에 불가 타입 - 배열/객체 등
  await TestValidator.error("student_id array type forbidden")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { student_id: ["a", "b"] as any },
    })
  );
  await TestValidator.error("channel_type object type forbidden")(() =>
    api.functional.attendance.notificationChannels.patch(connection, {
      body: { channel_type: { t: "app_push" } as any },
    })
  );
}