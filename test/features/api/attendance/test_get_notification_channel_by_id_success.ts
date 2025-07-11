import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";

/**
 * 알림 수신 채널을 id로 상세 조회하는 기능의 정상동작을 검증합니다.
 *
 * 이 테스트는 본인(또는 관리자)이 접근 권한이 있는 알림 채널 id에 대해, 상세 정보(atomic 필드 포함)가 정확히 반환되는지 확인합니다.
 * 테스트 시작 전 새로운 notification channel을 1건 생성(POST)하여 해당 채널 id를 기반으로 GET 요청을 수행합니다.
 *
 * [테스트 절차]
 * 1. 테스트용 student_id, (선택적으로 parent_id)를 준비하여 notification channel을 생성합니다.
 * 2. 생성된 notification channel의 id를 이용해 단건 상세조회 API를 호출합니다.
 * 3. GET 응답이 성공적으로 반환됐는지, 생성 정보와 세부 atomic 필드가 정확히 일치하는지 검증합니다.
 */
export async function test_api_attendance_notificationChannels_getById_success(
  connection: api.IConnection,
) {
  // 1. 테스트용 notification channel 데이터 생성
  const channelCreateInput = {
    student_id: typia.random<string & tags.Format<"uuid">>(),
    parent_id: null,
    channel_type: "app_push",
    is_enabled: true,
    preference_order: 1,
  } satisfies IAttendanceNotificationChannel.ICreate;

  const created: IAttendanceNotificationChannel = await api.functional.attendance.notificationChannels.post(connection, {
    body: channelCreateInput,
  });
  typia.assert(created);

  // 2. 단건 상세조회
  const fetched: IAttendanceNotificationChannel = await api.functional.attendance.notificationChannels.getById(connection, {
    id: created.id,
  });
  typia.assert(fetched);

  // 3. 값 비교 (atomic 필드 상세 검증)
  TestValidator.equals("id 일치 여부")(fetched.id)(created.id);
  TestValidator.equals("student_id 일치 여부")(fetched.student_id)(channelCreateInput.student_id);
  TestValidator.equals("parent_id 일치 여부")(fetched.parent_id)(channelCreateInput.parent_id);
  TestValidator.equals("channel_type 일치 여부")(fetched.channel_type)(channelCreateInput.channel_type);
  TestValidator.equals("is_enabled 일치 여부")(fetched.is_enabled)(channelCreateInput.is_enabled);
  TestValidator.equals("preference_order 일치 여부")(fetched.preference_order)(channelCreateInput.preference_order);
  // created_at, updated_at은 시스템에서 자동 생성되므로 유효성(ISO 8601, 종류)이 맞는지만 typia로 검증
  typia.assert(fetched.created_at);
  typia.assert(fetched.updated_at);
}