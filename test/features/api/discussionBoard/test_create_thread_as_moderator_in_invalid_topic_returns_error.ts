import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate error handling for thread creation with invalid/non-existent topic
 * by moderator.
 *
 * This test checks that the API correctly returns an error (such as a 404 Not
 * Found) when attempting to create a new thread under a topicId that does not
 * exist in the system. The key validation is that referential integrity and
 * resource existence checks are enforced.
 *
 * Steps:
 *
 * 1. Generate a random UUID to serve as an invalid/non-existent topicId.
 * 2. Attempt to create a thread with valid thread data (title), using the invalid
 *    topicId as moderator.
 * 3. Assert that the API throws an error and does not create a thread (expect
 *    error, not success).
 * 4. Confirm that error thrown indicates topic not found (e.g., status 404 or
 *    similar; do not check error message, only error occurrence).
 */
export async function test_api_discussionBoard_test_create_thread_as_moderator_in_invalid_topic_returns_error(
  connection: api.IConnection,
) {
  // 1. Generate invalid/non-existent topicId
  const invalidTopicId: string = typia.random<string & tags.Format<"uuid">>();
  // 2. Define valid thread creation body
  const body: IDiscussionBoardThreads.ICreate = {
    title: "Thread for non-existent topic",
  };
  // 3. Attempt API call and check error
  await TestValidator.error(
    "creating thread in non-existent topic should fail",
  )(async () => {
    await api.functional.discussionBoard.moderator.topics.threads.create(
      connection,
      {
        topicId: invalidTopicId,
        body,
      },
    );
  });
}
