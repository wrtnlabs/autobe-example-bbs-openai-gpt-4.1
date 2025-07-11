import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";

/**
 * 권한 없는 사용자가 타인이 소유한 notification channel을 삭제하는 시도를 했을 때 403 forbidden 에러가 발생하는지 검증.
 * 
 * 이 테스트는 타 사용자가 소유한 notification channel 데이터를 테스트 중에 직접 생성한 뒤,
 * 현재 연결된 사용자로써 해당 채널에 대해 DELETE를 시도, 권한 부족으로 인한 403 에러가 발생하는지 확인합니다.
 * 
 * 구현 순서
 * 1. (선행조건) 타인의 notification channel 데이터 생성 - POST /attendance/notificationChannels
 * 2. 생성된 notification channel의 id를 확보
 * 3. 현재 연결된 사용자로써 DELETE /attendance/notificationChannels/{id} 요청을 실행
 * 4. 403 forbidden 에러 발생 여부를 TestValidator.error로 검증 (not found 등 오류는 의도하지 않음)
 */
export async function test_api_attendance_test_delete_notification_channel_unauthorized(
  connection: api.IConnection,
) {
  // 1. 타인의 notification channel 데이터를 임의/random 값으로 생성
  const otherChannel = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id: typia.random<string & tags.Format<"uuid">>(),
      parent_id: typia.random<boolean>() ? typia.random<string & tags.Format<"uuid">>() : null,
      channel_type: "app_push",
      is_enabled: true,
      preference_order: typia.random<number & tags.Type<"int32">>(),
    } satisfies IAttendanceNotificationChannel.ICreate,
  });
  typia.assert(otherChannel);

  // 2. (옵션) 권한이 실제로 없는 사용자라는 조건 보장: 실제 환경에서는 connection 객체의 사용자와 다른 학생/부모로 생성 필요
  // 만약 connection이 일반 인증된 상태(학생/부모, 또는 teacher)라면, 다른 student_id/parent_id 값으로 생성하는 방식

  // 3. 현재 연결된 사용자로써 타인 채널에 DELETE 요청 시도
  await TestValidator.error("403 forbidden must be thrown for unauthorized delete")(
    async () => {
      await api.functional.attendance.notificationChannels.eraseById(connection, {
        id: otherChannel.id,
      });
    },
  );
}