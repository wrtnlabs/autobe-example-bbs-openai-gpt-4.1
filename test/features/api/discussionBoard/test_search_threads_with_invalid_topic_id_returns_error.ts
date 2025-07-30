import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IPageIDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThreads";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Attempt to search discussion board threads using an invalid/non-existent
 * topicId.
 *
 * This test ensures that when searching for threads under a topic that does not
 * exist (invalid topic UUID), the API does NOT return a silent empty result or
 * succeed, but instead returns a clear error response (such as an error throw,
 * HTTP error code, or other explicit failure notification).
 *
 * Steps:
 *
 * 1. Generate a random UUID that does not correspond to any real topic (since
 *    there are no dependency set-up steps, we assume randomness suffices for
 *    "non-existent").
 * 2. Attempt to search for threads under this topicId, with generic or empty
 *    filter parameters.
 * 3. Expect the API call to fail with an error (via exception or HTTP error).
 * 4. Assert that an error is thrown and no thread list or empty list is returned
 *    for an invalid topic id.
 */
export async function test_api_discussionBoard_test_search_threads_with_invalid_topic_id_returns_error(
  connection: api.IConnection,
) {
  // 1. Generate random non-existent topicId (UUID format)
  const invalidTopicId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to search threads under this topic
  await TestValidator.error(
    "searching threads with invalid topic id should throw",
  )(async () => {
    await api.functional.discussionBoard.topics.threads.search(connection, {
      topicId: invalidTopicId,
      body: {}, // No filters needed
    });
  });
}
