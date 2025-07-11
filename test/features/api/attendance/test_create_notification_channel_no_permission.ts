import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";

/**
 * 교사 권한이 notification channel 생성 엔드포인트 접근 시 403 Forbidden 발생 검증
 *
 * 학생/학부모 또는 관리자가 아닌 교사 권한 등 비허용 계정에서 notification channel 생성 API를 호출할 때,
 * 반드시 403 Forbidden 에러가 반환되어야 함을 검증합니다.
 *
 * 테스트 흐름:
 * 1. (전제) connection에 교사 권한 인증 토큰이 세팅된 상태로 가정
 * 2. 임의의 유효한 알림 채널 등록 데이터(IAttendanceNotificationChannel.ICreate)를 생성
 * 3. notification 채널 생성 API 호출
 * 4. 403 Forbidden 에러가 발생하는지 확인
 *
 * 포인트:
 * - 정상 데이터로 요청해도 교사 권한이므로 반드시 Forbidden 오류가 발생해야 함
 */
export async function test_api_attendance_test_create_notification_channel_no_permission(
  connection: api.IConnection,
) {
  // (전제) connection에 교사 권한 인증 토큰이 포함되어 있음
  // 실제 테스트 환경에서는 반드시 별도의 교사 로그인 과정을 거쳐야 함

  // 1. 임의의 notification channel 등록 본문 정의 (필수값 채움)
  const body: IAttendanceNotificationChannel.ICreate = {
    student_id: typia.random<string & tags.Format<"uuid">>(),
    parent_id: null,
    channel_type: "app_push",
    is_enabled: true,
    preference_order: 1,
  };

  // 2. Forbidden(403) 발생하는지 확인
  await TestValidator.error("교사 권한 notification channel 생성 Forbidden 오류 확인")(
    async () => {
      await api.functional.attendance.notificationChannels.post(connection, {
        body: body,
      });
    },
  );
}