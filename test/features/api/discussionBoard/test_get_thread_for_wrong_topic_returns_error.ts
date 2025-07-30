import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * E2E test for referential integrity enforcement in thread retrieval.
 *
 * Validates the case where an attempt is made to fetch a thread using a
 * matching (existing) threadId but with a topicId not actually related to that
 * thread. The system should enforce referential integrity, returning an error
 * instead of the thread data.
 *
 * Steps:
 *
 * 1. Create a thread under a specific topic (get that topicId and resulting
 *    threadId).
 * 2. Get a second valid topic, unrelated to the created thread (topic B).
 * 3. Attempt to retrieve the thread using the correct threadId but topic B's id.
 * 4. Assert the API returns an error (and does not leak unrelated thread data).
 */
export async function test_api_discussionBoard_test_get_thread_for_wrong_topic_returns_error(
  connection: api.IConnection,
) {
  // 1. Create a thread under Topic A
  const topicAId = typia.random<string & tags.Format<"uuid">>();
  const createdThread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topicAId,
        body: {
          title: RandomGenerator.alphaNumeric(16),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(createdThread);

  // 2. Get a second topic (Topic B, unrelated to thread)
  const topicBId = typia.random<string & tags.Format<"uuid">>();
  const topicB = await api.functional.discussionBoard.topics.at(connection, {
    topicId: topicBId,
  });
  typia.assert(topicB);

  // 3. Try fetching the thread using topicB.id as parent (should error)
  await TestValidator.error("wrong topic-thread relationship triggers error")(
    async () => {
      await api.functional.discussionBoard.topics.threads.at(connection, {
        topicId: topicB.id,
        threadId: createdThread.id,
      });
    },
  );
}
