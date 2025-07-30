import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate enforcement of unique thread titles within the same topic.
 *
 * This test verifies that when attempting to create two threads with the same
 * title under a single topic, creation of the first thread should succeed, but
 * the second attempt with the identical title must fail by raising a uniqueness
 * error – confirming the per-topic thread title constraint is enforced.
 *
 * Business steps:
 *
 * 1. Retrieve (confirm existence of) a topic using its topicId.
 * 2. Create a thread under this topic using a unique, random title.
 * 3. Attempt to create another thread under the same topic using exactly the same
 *    title.
 * 4. Confirm that the first creation succeeds and the second returns an error
 *    (violation of title uniqueness per topic).
 */
export async function test_api_discussionBoard_test_create_thread_with_duplicate_title_returns_error(
  connection: api.IConnection,
) {
  // 1. Retrieve and confirm topic exists
  const topic = await api.functional.discussionBoard.topics.at(connection, {
    topicId: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(topic);

  // 2. Create the initial thread with a specific random title
  const threadTitle = `E2E Unique Thread ${typia.random<string>()}`;
  const createdThread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: threadTitle,
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(createdThread);
  TestValidator.equals("thread title matches")(createdThread.title)(
    threadTitle,
  );
  TestValidator.equals("discussion_board_topic_id matches")(
    createdThread.discussion_board_topic_id,
  )(topic.id);

  // 3 & 4. Attempt to create another thread with the same title and expect failure
  await TestValidator.error("duplicate thread title must fail")(async () => {
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: threadTitle,
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  });
}
