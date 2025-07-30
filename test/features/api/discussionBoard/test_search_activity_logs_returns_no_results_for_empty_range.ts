import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";
import type { IPageIDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActivityLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 활동 로그 비어있는 결과 필터링 동작 검증
 *
 * 관리자 감사 로그를 원하는 검색창(시간 범위 등)으로 조회할 때, 해당 범위 내에 일치하는 로그가 하나도 없으면 결과 데이터 배열이 비어
 * 있어야 하며, 에러가 발생하지 않아야 함을 검증한다.
 *
 * 1. 사전에, 테스트용 검색 범위(필터 윈도우) 바깥에 충분히 과거 시점(예: 2022년) 로그를 1건 생성해둔다. (즉, DB가 완전히
 *    비어있지는 않은 상태!)
 * 2. 아주 최근 시점(예: 2025년)으로 action_timestamp 검색 범위를 limit으로 하는 조건으로 로그를 검색한다.
 * 3. 반환된 data 배열은 빈 배열이어야 하며, pagination 값은 정상적으로 반환되고, 에러가 없어야 한다.
 *
 * 성공: 에러 없이 정상적으로 빈 배열이 반환되는 것 실패: 빈 결과가 아닌 경우, 또는 에러가 발생할 경우
 */
export async function test_api_discussionBoard_test_search_activity_logs_returns_no_results_for_empty_range(
  connection: api.IConnection,
) {
  // 1. 과거 시점 로그 생성: 2022년 1월 1일 00:00:00 UTC
  const oldLog = await api.functional.discussionBoard.admin.activityLogs.create(
    connection,
    {
      body: {
        actor_id: typia.random<string & tags.Format<"uuid">>(),
        actor_type: "admin",
        action_type: "manual_test",
        action_timestamp: "2022-01-01T00:00:00.000Z",
        topic_id: null,
        thread_id: null,
        post_id: null,
        ip_address: null,
        user_agent: null,
        metadata_json: null,
      } satisfies IDiscussionBoardActivityLog.ICreate,
    },
  );
  typia.assert(oldLog);

  // 2. 최근(미래)시점만을 검색 필터로 지정 (예: 2025~2026년)
  const recentFrom = "2025-01-01T00:00:00.000Z";
  const recentTo = "2025-12-31T23:59:59.999Z";

  const searchResult =
    await api.functional.discussionBoard.admin.activityLogs.search(connection, {
      body: {
        action_timestamp_from: recentFrom,
        action_timestamp_to: recentTo,
        limit: 20,
        page: 1,
      } satisfies IDiscussionBoardActivityLog.IRequest,
    });
  typia.assert(searchResult);

  // 3. 결과 검증: 빈 배열이어야 하며 pagination은 정상
  TestValidator.equals("activityLogs: empty result data")(searchResult.data)(
    [],
  );
  TestValidator.predicate("activityLogs: valid pagination")(
    typeof searchResult.pagination === "object" &&
      typeof searchResult.pagination.current === "number" &&
      typeof searchResult.pagination.limit === "number" &&
      typeof searchResult.pagination.records === "number" &&
      typeof searchResult.pagination.pages === "number" &&
      searchResult.pagination.current === 1,
  );
}
