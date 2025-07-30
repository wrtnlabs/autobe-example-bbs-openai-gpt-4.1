import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IPageIDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThreads";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Verify that searching for threads under a topic using non-existent criteria
 * returns empty paginated result (not error).
 *
 * 비즈니스 목적: 사용자가 없는 키워드 등으로 검색해도 에러가 아닌 정상 페이징 빈 배열/0건 결과를 반환하는지 검증합니다.
 *
 * 1. 유효한 토픽을 확보한다 (존재하지 않는 경우라도 랜덤 UUID로 확보 가능).
 * 2. 실제로 존재하지 않는 조합의 title로 thread를 검색해본다.
 * 3. 검색 응답이 정상(에러X)이며, data가 빈 배열([])이고 records/pages도 0임을 확인한다.
 * 4. 페이징 current, limit 등 메타데이터가 기대값인지 검증한다.
 */
export async function test_api_discussionBoard_test_search_threads_with_nonexistent_criteria_returns_empty(
  connection: api.IConnection,
) {
  // 1. Ensure there is a valid topic (dependency)
  const topic = await api.functional.discussionBoard.topics.at(connection, {
    topicId: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(topic);

  // 2. Search for threads by a title that should not exist
  const nonExistentTitle = "non-existent-keyword-" + Date.now();
  const result = await api.functional.discussionBoard.topics.threads.search(
    connection,
    {
      topicId: topic.id,
      body: {
        topic_id: topic.id,
        title: nonExistentTitle,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardThreads.IRequest,
    },
  );
  typia.assert(result);

  // 3. Validate result is empty (no error, empty data array, zero records/pages)
  TestValidator.equals("empty thread data")(result.data)([]);
  TestValidator.equals("records = 0")(result.pagination.records)(0);
  TestValidator.equals("pages = 0")(result.pagination.pages)(0);
  TestValidator.equals("current = 1")(result.pagination.current)(1);
  TestValidator.equals("limit = 10")(result.pagination.limit)(10);
}
