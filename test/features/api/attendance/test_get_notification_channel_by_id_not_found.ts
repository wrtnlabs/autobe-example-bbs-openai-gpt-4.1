import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";

/**
 * 존재하지 않는 알림 채널 조회 시 404 not found 에러 검증
 *
 * 요청한 알림 채널(id)이 실제로 존재하지 않을 때, GET /attendance/notificationChannels/{id}
 * 엔드포인트가 404 not found 에러를 반환하는지 확인한다.
 *
 * 테스트 목표 및 흐름:
 * 1. typia.random을 사용해 무작위 UUID(id) 값을 생성한다.
 * 2. 해당 id로 상세 조회 요청을 시도한다.
 * 3. 404 not found 에러가 발생하는지 TestValidator.error로 검증한다.
 *
 * 별도의 사전 데이터 생성, 삭제, 인증 처리 없이, 존재하지 않는 값만으로 테스트를 수행한다.
 */
export async function test_api_attendance_test_get_notification_channel_by_id_not_found(
  connection: api.IConnection,
) {
  // 1. 무작위 UUID 값 준비
  const randomId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();

  // 2. 존재하지 않는 id로 상세조회 요청 및 404 not found 에러 검증
  await TestValidator.error("존재하지 않는 id 조회 시 404 not found 응답")(
    async () => {
      await api.functional.attendance.notificationChannels.getById(connection, {
        id: randomId,
      });
    },
  );
}