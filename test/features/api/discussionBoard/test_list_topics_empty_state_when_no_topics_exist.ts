import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTopics";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Test the /discussionBoard/topics endpoint's empty state behavior.
 *
 * This test verifies the endpoint when there are no discussion topics in the
 * database— representing a newly-initialized system or after a cleanup where
 * all topics are removed. It checks that the response is a valid paginated
 * structure with an empty result set, not an error. The pagination metadata
 * must still be present and consistent (e.g., page 1, 0 records, 0 pages). This
 * ensures proper UX for a discussion board UI with no initial data.
 *
 * Steps:
 *
 * 1. Call the /discussionBoard/topics API with no topics pre-existing (assumed
 *    empty DB or clean start).
 * 2. Assert the response type matches IPageIDiscussionBoardTopics.ISummary.
 * 3. Assert the data array is empty (length === 0).
 * 4. Assert pagination metadata fields are present and have correct zero-state
 *    values.
 *
 * This test should be run after DB cleaning or in isolated stateless CI
 * environments.
 */
export async function test_api_discussionBoard_test_list_topics_empty_state_when_no_topics_exist(
  connection: api.IConnection,
) {
  // 1. Call the /discussionBoard/topics API to get the topic list
  const output = await api.functional.discussionBoard.topics.index(connection);
  // 2. Assert the response matches the expected structure
  typia.assert(output);
  // 3. Validate the data property is an empty array
  TestValidator.equals("data is empty")(output.data.length)(0);
  // 4. Check pagination metadata fields reflect zero-state
  TestValidator.equals("no records")(output.pagination.records)(0);
  TestValidator.equals("no pages")(output.pagination.pages)(0);
  TestValidator.equals("current page is 1")(output.pagination.current)(1); // Page should be 1 in empty state
  TestValidator.predicate("output.pagination.limit is present and positive")(
    typeof output.pagination.limit === "number" && output.pagination.limit > 0,
  );
}
