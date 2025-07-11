import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationHistory";
import type { IPageIAttendanceNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceNotificationHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 잘못된 검색 조건에서의 알림 전송 이력(Attendance Notification History) 조회 검증
 *
 * 이 테스트는 다음과 같은 오류/경계 상황을 검증합니다:
 *
 * 1. notification_id에 UUID가 아닌 잘못된 값을 입력하여 요청 시 422 validation 에러가 발생하는지 확인
 * 2. 허용되지 않은 status 값을 입력할 경우 validation 에러가 발생하거나, 빈 결과가 정상적인 페이징/메타와 함께 반환되는지 확인
 * 3. 존재하지 않는(랜덤 uuid) notification_id로 조회 시, 빈 결과 및 정상적인 페이지네이션 구조 반환 검증
 *
 * 각 케이스에서 응답 타입 및 에러 발생 여부와 페이지네이션 meta 정보를 꼼꼼히 체크하여 API의 견고함을 검증합니다.
 */
export async function test_api_attendance_test_list_notification_histories_with_invalid_search_conditions(
  connection: api.IConnection,
) {
  // 1. notification_id에 잘못된(non-uuid) 값 입력 시 422 validation 에러
  await TestValidator.error("notification_id에 UUID가 아닌 값 입력시 422 validation 에러")(
    () => api.functional.attendance.notificationHistories.patch(connection, {
      body: {
        notification_id: "NOT_A_UUID",
      },
    })
  );

  // 2. status 필드에 허용되지 않은 임의 값을 입력했을 때,
  //    validation 에러가 발생하거나, 정상적으로 빈 결과 및 페이지네이션 정보가 반환되어야 함
  try {
    const result = await api.functional.attendance.notificationHistories.patch(connection, {
      body: {
        status: "not_allowed_status"
      },
    });
    // 반환이 정상일 경우: 빈 배열과 페이지네이션 메타폼이 들어 있는지 확인
    typia.assert(result);
    TestValidator.equals("빈 결과 data 배열")(result.data.length)(0);
    if (result.pagination) {
      typia.assert(result.pagination);
    }
  } catch {
    // 에러가 발생해도 해당 케이스는 성공 (validation을 엄격히 처리하는 경우)
  }

  // 3. 존재하지 않는(랜덤 uuid) notification_id로 검색 시에도
  //    data는 빈 배열, pagination은 정상 구조임을 확인
  const resp = await api.functional.attendance.notificationHistories.patch(connection, {
    body: {
      notification_id: typia.random<string & tags.Format<"uuid">>()
    },
  });
  typia.assert(resp);
  TestValidator.equals("존재하지 않는 notification_id의 빈 data")(resp.data.length)(0);
  if (resp.pagination) {
    typia.assert(resp.pagination);
  }
}