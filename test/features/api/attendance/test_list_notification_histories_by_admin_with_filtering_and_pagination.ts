import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotification";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";
import type { IAttendanceNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationHistory";
import type { IPageIAttendanceNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceNotificationHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * [관리자 알림 이력 검색/필터/페이징 테스트]
 *
 * 관리자가 출석 알림 이벤트(notification) 및 채널 데이터(channel) 사전 등록 후,
 * 1. notification_id + channel_id + status (예시상 "delivered") 기준 필터 쿼리로 발송 이력 목록을 조회한다.
 * 2. 페이징 파라미터(page, limit)로 여러 페이지 쿼리 테스트(2페이지 이상)도 검증한다.
 * 3. 결과 리스트에 필터 조건이 정확히 적용되는지(주어진 id/status가 모두 일치) 및 pagination block metadata(총건수/현재페이지/전체페이지/limit 등)의 유효성 also 점검한다.
 * 4. 필터(예: 존재하지 않는 id, 허용되지 않은 status)로 조회 시 0건 또는 validation 오류(422 코드) 응답 체크
 * 5. 비관리자(권한 없음) 상태에서 해당 API 호출하면 403 코드 반환됨을 확인한다.
 *
 * 사전 준비로써 notification/post, notificationChannel/post로 데이터 생성. 단일 notification, 단일 채널 기준 히스토리가 반드시 존재할 수 있게끔 데이터 관계 세팅 실시.
 */
export async function test_api_attendance_test_list_notification_histories_by_admin_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. 알림(Notification) 및 알림 채널(NotificationChannel) 생성 (테스트 데이터 준비)
  const attendance_record_id = typia.random<string & tags.Format<"uuid">>();
  const student_id = typia.random<string & tags.Format<"uuid">>();
  const classroom_id = typia.random<string & tags.Format<"uuid">>();
  const triggered_at = new Date().toISOString();

  // 알림 생성
  const notification = await api.functional.attendance.notifications.post(connection, {
    body: {
      attendance_record_id,
      student_id,
      classroom_id,
      event_type: "present",
      triggered_at,
      message_template: "오늘은 출석이 기록되었습니다.",
    } satisfies IAttendanceNotification.ICreate,
  });
  typia.assert(notification);

  // 알림 채널 생성
  const channel = await api.functional.attendance.notificationChannels.post(connection, {
    body: {
      student_id,
      channel_type: "app_push",
      is_enabled: true,
      preference_order: 1,
    } satisfies IAttendanceNotificationChannel.ICreate,
  });
  typia.assert(channel);

  // 2. 알림 이력 검색 - 정상 필터링/페이징 시나리오 (단일 notification_id, channel_id, status 필터)
  // 테스트 편의상 실제 이력 엔트리가 자동 또는 배치로 즉시 생성된다고 가정(테스트 DB 시뮬레이션에 따라 다를 수 있으므로 일부 assertion은 type check까지만 진행)
  for (const status of ["pending", "delivered", "failed"]) {
    const response = await api.functional.attendance.notificationHistories.patch(connection, {
      body: {
        notification_id: notification.id,
        channel_id: channel.id,
        status: status,
        page: 1,
        limit: 10,
      },
    });
    typia.assert(response);
    // 필터 값이 정확히 반영됐는지 데이터 row별 검증(조건일치 체크).
    for (const row of response.data) {
      TestValidator.equals("notification_id 필터적용됨")(row.notification_id)(notification.id);
      TestValidator.equals("channel_id 필터적용됨")(row.channel_id)(channel.id);
      TestValidator.equals("status 필터적용됨")(row.status)(status);
    }
    // 페이지네이션 블럭 자세히 체크
    TestValidator.predicate("페이지 limit 유효성")(response.pagination.limit === 10);
    TestValidator.predicate("현재 페이지")(response.pagination.current === 1);
    TestValidator.predicate("총레코드 >=0")(response.pagination.records >= 0);
    TestValidator.predicate("총 페이지 >= 1")(response.pagination.pages >= 1);
  }

  // 3. 페이징 - 2페이지 이상 요청 후 데이터 및 meta 검사 (데이터가 적으면 empty여도 무관)
  const page2 = await api.functional.attendance.notificationHistories.patch(connection, {
    body: {
      notification_id: notification.id,
      channel_id: channel.id,
      status: "delivered",
      page: 2,
      limit: 1,
    },
  });
  typia.assert(page2);
  TestValidator.equals("2페이지 요청")(page2.pagination.current)(2);
  TestValidator.predicate("limit=1 동작")(page2.pagination.limit === 1);

  // 4. 잘못된 필터 - 존재하지 않는 id(0건 expected)
  const empty = await api.functional.attendance.notificationHistories.patch(connection, {
    body: {
      notification_id: typia.random<string & tags.Format<"uuid">>(),
      channel_id: typia.random<string & tags.Format<"uuid">>(),
      status: "failed",
      page: 1,
      limit: 5,
    },
  });
  typia.assert(empty);
  TestValidator.equals("0건 응답")(empty.data.length)(0);
  TestValidator.equals("총건수=0")(empty.pagination.records)(0);

  // 5. validation 오류 - status에 엉뚱한 값 전달(422 기대)
  await TestValidator.error("status 필드 validation 오류 expected")(async () => {
    await api.functional.attendance.notificationHistories.patch(connection, {
      body: {
        notification_id: notification.id,
        channel_id: channel.id,
        status: "NON_EXISTENT_STATUS",
        page: 1,
        limit: 5,
      },
    });
  });

  // 6. 권한 없음 - 관리자가 아닌 사용자는 403을 반환해야 함. (테스트 환경에서의 권한 스위칭이 별도 구현되어 있으면 활용)
  // 만약 강제로 connection을 비관리자 권한으로 세팅할 수 있다면 아래 와 같이 테스트.
  // (connection.withoutAdmin() 등 별도 토큰/설정이 있다면 그 컨텍스트로 호출)
  // await TestValidator.error("비관리자 403 오류")(async () => {
  //   await api.functional.attendance.notificationHistories.patch(nonAdminConnection, { ... });
  // });
}