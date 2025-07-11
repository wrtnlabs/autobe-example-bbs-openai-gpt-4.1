import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";
import type { IPageIAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceNotificationChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 정상 파라미터로 notification channel 리스트 조회 - 다양한 조건별 정상 반환검증 e2e
 *
 * 이 테스트는 여러 유형의 알림 채널(notification channel)을 미리 생성한 후, 다양한 필터 조건/페이징 옵션이 정상 동작함을 검증합니다.
 *
 * 1. 채널 3건을 서로 다른 student_id, channel_type, is_enabled, preference_order로 생성(사전 데이터 세팅)
 * 2. (필터1) student_id+channel_type 조합 단일 데이터 반환 확인
 * 3. (필터2) is_enabled만 false로 조건 검색, 정확히 해당 필드 매칭 채널만 반환됨 검증
 * 4. (필터3) preference_order로 검색 시 해당 채널만 딱 반환됨
 * 5. 페이징(page/limit) 옵션 적용 결과 pagination 필드(meta) 및 반환 data 건수가 올바른지 검증
 * 6. 각 응답의 모든 채널 오브젝트가 atomic 필드만 포함하는지 타입 단언 및 내용 일치성 체크
 */
export async function test_api_attendance_test_list_notification_channels_with_valid_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. 테스트 데이터: notification channel 3건 생성 (student, type, 상태 모두 다르게)
  const studentId1 = typia.random<string & tags.Format<"uuid">>();
  const studentId2 = typia.random<string & tags.Format<"uuid">>();

  // chan1: studentId1 + app_push + 활성화 + order 1
  const chan1 = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id: studentId1,
      channel_type: "app_push",
      is_enabled: true,
      preference_order: 1,
    } satisfies IAttendanceNotificationChannel.ICreate,
  });
  typia.assert(chan1);

  // chan2: studentId2 + sms + 비활성 + order 2
  const chan2 = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id: studentId2,
      channel_type: "sms",
      is_enabled: false,
      preference_order: 2,
    } satisfies IAttendanceNotificationChannel.ICreate,
  });
  typia.assert(chan2);

  // chan3: studentId1 + email + 활성화 + order 3
  const chan3 = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id: studentId1,
      channel_type: "email",
      is_enabled: true,
      preference_order: 3,
    } satisfies IAttendanceNotificationChannel.ICreate,
  });
  typia.assert(chan3);

  // 2. student_id + channel_type 필터: chan1만 추출돼야 함
  const list1 = await api.functional.attendance.notificationChannels.patch(connection, {
    body: {
      student_id: studentId1,
      channel_type: "app_push",
    } satisfies IAttendanceNotificationChannel.IRequest,
  });
  typia.assert(list1);
  TestValidator.equals("student_id+channel_type 조합 일치")(list1.data.length)(1);
  TestValidator.equals("chan1 반환됨")(list1.data[0].id)(chan1.id);

  // 3. is_enabled: false로만 필터: chan2만 반환
  const list2 = await api.functional.attendance.notificationChannels.patch(connection, {
    body: {
      is_enabled: false,
    } satisfies IAttendanceNotificationChannel.IRequest,
  });
  typia.assert(list2);
  TestValidator.predicate("is_enabled=false만 있음")(list2.data.length > 0 && list2.data.every(d => d.is_enabled === false));

  // 4. preference_order=3로만 필터: chan3만 반환
  const list3 = await api.functional.attendance.notificationChannels.patch(connection, {
    body: {
      preference_order: 3,
    } satisfies IAttendanceNotificationChannel.IRequest,
  });
  typia.assert(list3);
  TestValidator.equals("preference_order=3 하나만")(list3.data.length)(1);
  TestValidator.equals("chan3 반환")(list3.data[0].id)(chan3.id);

  // 5. 페이징(page=1, limit=2): 2개 이하만, pagination 메타도 맞는지
  const paged = await api.functional.attendance.notificationChannels.patch(connection, {
    body: {
      page: 1,
      limit: 2,
    } satisfies IAttendanceNotificationChannel.IRequest,
  });
  typia.assert(paged);
  TestValidator.predicate("max 2개만")(paged.data.length <= 2);
  TestValidator.equals("페이지 1")(paged.pagination.current)(1);
  TestValidator.equals("limit=2")(paged.pagination.limit)(2);
}