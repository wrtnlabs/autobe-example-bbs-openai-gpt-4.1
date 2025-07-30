import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Test that even a moderator cannot create a thread under a closed topic.
 *
 * Business context:
 *
 * - Topics may be closed (locked) to prevent new thread creation.
 * - Moderators typically have elevated permissions, but this endpoint must still
 *   respect the 'closed' topic rule.
 * - Attempting to create a thread in a closed topic should result in a business
 *   rule error.
 *
 * Steps:
 *
 * 1. Fetch a topic by its topicId (precondition: topic is closed == true)
 * 2. Attempt to create a thread as a moderator using
 *    /discussionBoard/moderator/topics/{topicId}/threads
 * 3. Expect a business rule error (e.g., HTTP 4xx) and verify that the error
 *    occurs
 */
export async function test_api_discussionBoard_test_create_thread_as_moderator_in_closed_topic_returns_error(
  connection: api.IConnection,
) {
  // 1. Prepare a closed topic by topicId (dependency)
  const closedTopic = await api.functional.discussionBoard.topics.at(
    connection,
    {
      topicId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(closedTopic);
  TestValidator.predicate("topic is closed")(closedTopic.closed === true);

  // 2. Attempt to create a thread as a moderator under the closed topic
  await TestValidator.error("creating thread in closed topic should fail")(
    async () => {
      await api.functional.discussionBoard.moderator.topics.threads.create(
        connection,
        {
          topicId: closedTopic.id,
          body: {
            title: "Moderator Attempt Thread Title",
          } satisfies IDiscussionBoardThreads.ICreate,
        },
      );
    },
  );
}
