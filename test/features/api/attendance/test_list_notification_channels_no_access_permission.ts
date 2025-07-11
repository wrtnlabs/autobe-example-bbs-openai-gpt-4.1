import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";
import type { IPageIAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceNotificationChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 권한 없는 사용자(타인의 권한없는 student_id 또는 parent_id로) notification channel 목록을 조회할 때 접근 불가(권한 부족) 또는 데이터 미노출(빈 배열 반환) 여부 검증
 *
 * 실제 서비스에서는 본인이나 자녀(부모 계정)의 notification 채널 이외에는 볼 수 없어야 하며, 임의의 student_id/parent_id로 조회 조작을 시도해도
 * 1) HTTP 403 Forbidden(또는 권한 부족) 에러가 발생하거나,
 * 2) 정상 응답이 오더라도 data가 반드시 빈 배열(0건)이어야 한다는 점을 검증한다.
 * (에러 메시지/코드의 상세 검증은 제외)
 *
 * 1. 임의(권한 없는) student_id/parent_id를 생성한다 (typia.random UUID 사용)
 * 2. 알림 채널 patch 목록 API에 각각 student_id, parent_id로 접근을 시도한다
 * 3. 에러가 발생하는 경우(Forbidden)를 허용하며, 정상 응답이라면 data가 0건(빈 배열)인지 검증한다
 * 4. 주 목적은 접근권한 정책의 우회 차단 및 정보 노출 방지이다
 */
export async function test_api_attendance_test_list_notification_channels_no_access_permission(
  connection: api.IConnection,
) {
  // 1. 권한 없는 임의 student_id, parent_id 생성
  const arbitraryStudentId = typia.random<string & tags.Format<"uuid">>();
  const arbitraryParentId = typia.random<string & tags.Format<"uuid">>();

  // 2-1. 임의 student_id로 접근: 반드시 빈 배열 또는 권한 에러
  await TestValidator.error("권한 없는 student_id로 notification 채널 목록 요청")(
    async () => {
      const output = await api.functional.attendance.notificationChannels.patch(connection, {
        body: { student_id: arbitraryStudentId },
      });
      typia.assert(output);
      TestValidator.equals("빈 배열 반환 또는 권한 제한")(
        output.data.length
      )(0);
    },
  );

  // 2-2. 임의 parent_id로 접근: 반드시 빈 배열 또는 권한 에러
  await TestValidator.error("권한 없는 parent_id로 notification 채널 목록 요청")(
    async () => {
      const output = await api.functional.attendance.notificationChannels.patch(connection, {
        body: { parent_id: arbitraryParentId },
      });
      typia.assert(output);
      TestValidator.equals("빈 배열 반환 또는 권한 제한")(
        output.data.length
      )(0);
    },
  );
}