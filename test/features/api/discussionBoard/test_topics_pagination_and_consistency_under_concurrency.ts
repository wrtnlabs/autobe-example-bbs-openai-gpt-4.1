import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopics";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Test the paginated topics listing for concurrency/consistency.
 *
 * This test simulates a busy discussion board where new topics are being
 * rapidly created and ensures the paginated topics listing endpoint maintains
 * consistency: topics should not be duplicated across pages, newly added topics
 * after initial fetch should only appear on subsequent pages, and data from
 * multiple paginated fetches should combine without loss or duplication.
 *
 * However, since the API does not provide topic creation or explicit paging
 * parameters, this test is limited to verifying the uniqueness of topics in the
 * first page and the internal consistency of returned pagination metadata.
 * Actual simulation of concurrent additions or multi-page navigation is not
 * possible with the current endpoint, but the code structure reflects expected
 * best practices if such features existed.
 *
 * Steps:
 *
 * 1. Fetch the first page of topics
 * 2. (If possible) Simulate new topics being added here (limited by available
 *    APIs)
 * 3. Ensure topic IDs are unique within the page
 * 4. Validate consistency of page metadata (page number, total pages, record
 *    counts)
 *
 * If multi-page support or topic creation is added to the API in the future,
 * this function can be easily extended to test cross-page uniqueness and
 * concurrency behaviors more thoroughly.
 */
export async function test_api_discussionBoard_test_topics_pagination_and_consistency_under_concurrency(
  connection: api.IConnection,
) {
  // 1. Fetch the first page of topics
  const firstPage =
    await api.functional.discussionBoard.topics.index(connection);
  typia.assert(firstPage);

  // 2. (Business simulation): If the system allowed, simulate new topic additions between requests
  //    Not possible with provided APIs; step is illustrative only.

  // 3. Validate topic uniqueness within the returned page
  const topicIds = firstPage.data.map((t) => t.id);
  const uniqueTopicIds = Array.from(new Set(topicIds));
  TestValidator.equals("topics should be unique within page")(topicIds.length)(
    uniqueTopicIds.length,
  );

  // 4. Validate internal pagination metadata consistency
  TestValidator.predicate("current page should be >= 1")(
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate("total pages should be >= 1")(
    firstPage.pagination.pages >= 1,
  );
  TestValidator.predicate("total records >= listed items")(
    firstPage.pagination.records >= firstPage.data.length,
  );
}
