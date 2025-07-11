import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";

/**
 * 알림 수신 채널 삭제 성공 시나리오를 테스트합니다.
 *
 * 본인 혹은 관리자가 접근 권한이 있는 notification channel의 UUID로 삭제 요청 시,
 * 해당 채널이 실제로 삭제되거나(논리/물리 삭제), 더 이상 상세조회에 노출되지 않아야 하며,
 * 응답값(삭제 성공 플래그 및 deleted_id)과 상태 코드가 정책에 부합하는지 검증한다.
 *
 * 테스트 절차:
 * 1. 테스트용 notification channel을 생성한다.
 * 2. 생성된 channel의 id로 상세조회를 수행해 정상적으로 channel 정보가 조회되는지 확인한다.
 * 3. 해당 id로 삭제 API(eraseById)를 호출한다.
 * 4. 삭제 API의 응답값(success=true, deleted_id가 입력 id와 일치) 및 타입을 검증한다.
 * 5. 삭제된 id로 상세조회(getById)를 시도할 때 더 이상 채널 정보가 조회되지 않음을 확인한다(404 등 오류 기대).
 */
export async function test_api_attendance_test_delete_notification_channel_success(
  connection: api.IConnection,
) {
  // 1. 채널 생성
  const createInput: IAttendanceNotificationChannel.ICreate = {
    student_id: typia.random<string & tags.Format<"uuid">>(),
    parent_id: null, // NULL 허용 필드는 명시적으로 null
    channel_type: "app_push", // 실무 사용 예시
    is_enabled: true,
    preference_order: 1,
  };
  const channel = await api.functional.attendance.notificationChannels.post(connection, { body: createInput });
  typia.assert(channel);

  // 2. 상세조회: 실제 정상 생성 및 값 일치 확인
  const loaded = await api.functional.attendance.notificationChannels.getById(connection, { id: channel.id });
  typia.assert(loaded);
  TestValidator.equals("상세조회 PK 일치")(loaded.id)(channel.id);
  TestValidator.equals("channel_type 일치")(loaded.channel_type)(createInput.channel_type);

  // 3. 삭제 API 호출
  const deleted = await api.functional.attendance.notificationChannels.eraseById(connection, { id: channel.id });
  typia.assert(deleted);
  TestValidator.equals("삭제 성공 여부")(deleted.success)(true);
  TestValidator.equals("삭제된 id 일치")(deleted.deleted_id)(channel.id);

  // 4. 삭제 후 상세조회: 더 이상 채널이 조회되지 않아야 함
  await TestValidator.error("삭제된 채널 상세조회 불가")(
    async () => {
      await api.functional.attendance.notificationChannels.getById(connection, { id: channel.id });
    },
  );
}