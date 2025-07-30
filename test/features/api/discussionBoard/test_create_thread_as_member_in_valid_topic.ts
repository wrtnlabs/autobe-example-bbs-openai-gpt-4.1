import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * E2E test to verify that an authenticated member can create a thread under an
 * existing, active topic.
 *
 * This test ensures:
 *
 * 1. There is a valid, active (not closed) topic available
 * 2. An authenticated member can create a new thread in that topic by providing a
 *    unique title
 * 3. The API response returns the full thread info, and response data matches
 *    input title and topic context
 * 4. The returned object must properly link back to the topic and record creation
 *    info
 *
 * Test steps:
 *
 * 1. Retrieve a valid, not-closed topic using the dependency API
 * 2. Attempt to create a new thread in the topic, with a random title
 * 3. Verify the thread was created successfully, has correct topic/thread IDs,
 *    title matches, and creator info is populated
 */
export async function test_api_discussionBoard_test_create_thread_as_member_in_valid_topic(
  connection: api.IConnection,
) {
  // 1. Retrieve a valid topic using the dependency call. (Test assumes at least one open topic exists.)
  const topic: IDiscussionBoardTopics =
    await api.functional.discussionBoard.topics.at(connection, {
      topicId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(topic);
  TestValidator.predicate("topic should not be closed")(!topic.closed);

  // 2. Generate a unique thread title to avoid collision.
  const threadTitle = RandomGenerator.paragraph()(3);

  // 3. Create the thread as an authenticated member
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: threadTitle,
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 4. Validate response matches request and business rules
  TestValidator.equals("created thread title")(thread.title)(threadTitle);
  TestValidator.equals("thread topic link")(thread.discussion_board_topic_id)(
    topic.id,
  );
  TestValidator.equals("thread ID format")(typeof thread.id)("string");
  TestValidator.equals("creator_member_id presence")(
    typeof thread.creator_member_id,
  )("string");
  TestValidator.predicate("created_at is ISO8601 string")(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(thread.created_at),
  );
}
