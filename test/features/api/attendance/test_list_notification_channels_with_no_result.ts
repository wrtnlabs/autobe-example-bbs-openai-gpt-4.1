import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAttendanceNotificationChannel";
import type { IPageIAttendanceNotificationChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAttendanceNotificationChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 존재하지 않는 조건(존재하지 않는 student_id, parent_id, channel_type 등)으로 알림 채널 패치 요청 시
 * 결과 데이터가 비어있고, 페이지네이션의 total(레코드수) 값이 0으로 정상 반환되는지 검증한다.
 * 
 * 1. 실제로 존재하지 않는 UUID/타입 값을 student_id, parent_id, channel_type 필드에 지정해 조회를 요청한다.
 * 2. 응답의 data 배열이 비어 있는지 확인한다.
 * 3. pagination 정보에서 records(총 레코드수)가 0이고, pages(페이지수)가 0 또는 1로 정상적으로 표시되는지 확인한다.
 * 4. page, limit 등 입력 파라미터를 포함시켜 다양한 조합으로 empty 결과에 대한 안정성을 확인한다.
 */
export async function test_api_attendance_test_list_notification_channels_with_no_result(
  connection: api.IConnection,
) {
  // 1. 존재하지 않는 식별자 및 채널 타입으로 요청
  const nonexistentFilter = {
    student_id: typia.random<string & tags.Format<"uuid">>(),
    parent_id: typia.random<string & tags.Format<"uuid">>(),
    channel_type: "nonexistent_channel_type",
    page: 1,
    limit: 10,
  } satisfies IAttendanceNotificationChannel.IRequest;

  const response = await api.functional.attendance.notificationChannels.patch(connection, {
    body: nonexistentFilter,
  });
  typia.assert(response);

  // 2. 응답 데이터가 비어있는지 검증
  TestValidator.equals("empty data")(response.data)([]);

  // 3. pagination의 records가 0, pages가 0 또는 1인지 확인
  TestValidator.equals("records count is zero")(response.pagination.records)(0);
  TestValidator.predicate("pages value is 0 or 1")(response.pagination.pages === 0 || response.pagination.pages === 1);

  // 4. page, limit 조합 변경해도 empty 정상 처리 확인
  const pageLimitCombos = [
    { page: 1, limit: 100 },
    { page: 2, limit: 20 },
    { page: 10, limit: 1 },
  ];

  for (const combo of pageLimitCombos) {
    const res = await api.functional.attendance.notificationChannels.patch(connection, {
      body: {
        ...nonexistentFilter,
        ...combo,
      } satisfies IAttendanceNotificationChannel.IRequest,
    });
    typia.assert(res);
    TestValidator.equals("empty data")(res.data)([]);
    TestValidator.equals("records count is zero")(res.pagination.records)(0);
    TestValidator.predicate("pages value is 0 or 1")(res.pagination.pages === 0 || res.pagination.pages === 1);
  }
}