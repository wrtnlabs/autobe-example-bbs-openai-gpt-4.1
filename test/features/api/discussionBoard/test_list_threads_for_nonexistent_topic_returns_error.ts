import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThreads";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate that attempting to list threads for a non-existent topic returns a
 * proper error.
 *
 * Business context: If a client tries to fetch the thread list for a topicId
 * that does not exist in the system, the API must not return an empty (but
 * successful) result or a silent failure. Instead, it should respond explicitly
 * with an error that clearly indicates the requested topic does not exist,
 * typically using a 404 Not Found error or equivalent.
 *
 * Step-by-step process:
 *
 * 1. Generate a random UUID to use as a fake (non-existent) topicId.
 * 2. Attempt to fetch the list of threads for this topicId using the API.
 * 3. Assert that the API throws an error, and does not return a successful
 *    response with empty data.
 */
export async function test_api_discussionBoard_test_list_threads_for_nonexistent_topic_returns_error(
  connection: api.IConnection,
) {
  // 1. Generate a random (non-existent) topicId
  const fakeTopicId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to fetch threads for the non-existent topicId
  // 3. Assert that an error is thrown, not a valid page result
  await TestValidator.error(
    "should throw not found error for non-existent topic",
  )(async () => {
    await api.functional.discussionBoard.topics.threads.index(connection, {
      topicId: fakeTopicId,
    });
  });
}
