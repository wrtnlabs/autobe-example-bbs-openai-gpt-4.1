import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate moderator cannot create duplicate-titled threads in a topic.
 *
 * This test ensures that when a moderator attempts to create two threads with
 * the same title under a single topic, the API enforces a uniqueness constraint
 * and rejects the second creation with an error. This proves unique thread
 * title policy works across moderator actions, not just basic member role.
 *
 * Business steps:
 *
 * 1. Retrieve a valid topic (per dependency requirement, using a random UUID and
 *    fetching the topic to confirm existence).
 * 2. As a moderator, create the first thread under this topic with a unique random
 *    title.
 * 3. Attempt to create a second thread in the same topic with exactly the same
 *    title as before.
 * 4. Validate that the second creation results in an error due to duplicate/unique
 *    title constraint, per business logic.
 * 5. Do not assert error details/messages—only that error is thrown as per test
 *    policy.
 */
export async function test_api_discussionBoard_test_create_thread_as_moderator_with_duplicate_title_returns_error(
  connection: api.IConnection,
) {
  // 1. Ensure a valid topic exists (use random UUID and fetch topic details).
  const topicId = typia.random<string & tags.Format<"uuid">>();
  const topic = await api.functional.discussionBoard.topics.at(connection, {
    topicId,
  });
  typia.assert(topic);
  TestValidator.equals("topic id matches")(topic.id)(topicId);

  // 2. Create first thread as moderator with a unique title.
  const threadTitle = RandomGenerator.paragraph()(2);
  const thread =
    await api.functional.discussionBoard.moderator.topics.threads.create(
      connection,
      {
        topicId,
        body: { title: threadTitle } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);
  TestValidator.equals("thread title matches")(thread.title)(threadTitle);
  TestValidator.equals("parent topic matches")(
    thread.discussion_board_topic_id,
  )(topicId);

  // 3. Attempt to create a duplicate thread (same title, same topic) as moderator.
  await TestValidator.error("duplicate thread title should fail")(async () =>
    api.functional.discussionBoard.moderator.topics.threads.create(connection, {
      topicId,
      body: { title: threadTitle } satisfies IDiscussionBoardThreads.ICreate,
    }),
  );
}
