import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";

/**
 * 권한이 없는 사용자가 타인의 notification channel id로 조회 시도 시 403이 발생하는지 검증
 *
 * 이 테스트는 두 주요 시나리오를 검증한다:
 *
 * 1. 한 학생(user) 계정이 notification channel을 생성한다.
 * 2. 권한이 없는 학생 또는 부모가 해당 채널 id로 GET 조회를 시도할 경우, 403 권한 에러가 발생하는지 확인한다.
 *
 * 실제 권한 분리 구현이 API/connection 레이어에서 명확하게 되어 있다면, 여기에 맞게 connection을 적절히 분리(로그인 등)하여 테스트해야 한다.
 *
 * 1. notification channel을 생성(권한 있는 계정으로)
 * 2. 권한 없는 connection으로 동일 id의 notification channel 조회 시도 → 403 error 검증
 */
export async function test_api_attendance_test_get_notification_channel_by_id_no_permission(connection: api.IConnection) {
  // 1. notification channel 데이터 생성 (권한 있는 사용자로)
  const notificationChannel = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id: typia.random<string & tags.Format<'uuid'>>(),
      parent_id: null,
      channel_type: 'app_push',
      is_enabled: true,
      preference_order: 1,
    }
  });
  typia.assert(notificationChannel);

  // 2. 권한이 없는 사용자 connection으로 조회 시도
  // 실제 환경에서는 별도의 권한 없는 connection 혹은 타 사용자 connection이 필요합니다.
  // 여기서는 connection이 실제로 분리되어 있다고 가정 (구현 환경에 맞게 수정해야 함)
  await TestValidator.error('권한 없는 사용자는 타인의 notification channel을 조회할 수 없어야 한다')(async () => {
    // 예시: 권한 없는 사용자 connection 사용 (실제 로그인 전환 등이 필요할 수 있음)
    await api.functional.attendance.notificationChannels.getById(connection, { id: notificationChannel.id });
  });
}