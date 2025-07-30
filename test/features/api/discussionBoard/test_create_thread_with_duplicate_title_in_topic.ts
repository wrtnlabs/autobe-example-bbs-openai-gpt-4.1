import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate that thread titles are unique within a topic and that creating a
 * duplicate title results in a business error.
 *
 * Test flow:
 *
 * 1. Admin member is created (can create topics and threads).
 * 2. A new topic is created (as the parent for threads).
 * 3. A thread with a specific title is created under this topic.
 * 4. Attempt to create another thread with the exact same title under the same
 *    topic.
 * 5. Confirm that the API enforces unique thread titles within a topic by throwing
 *    an error on the duplicate attempt.
 *
 * Each step is validated for type safety and expected side effects.
 */
export async function test_api_discussionBoard_test_create_thread_with_duplicate_title_in_topic(
  connection: api.IConnection,
) {
  // 1. Create an admin member (board member)
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphabets(12),
    joined_at: new Date().toISOString(),
  };
  const adminMember = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberInput },
  );
  typia.assert(adminMember);

  // 2. Create a topic. Requires discussion_board_category_id (random UUID for test)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const topicInput: IDiscussionBoardTopics.ICreate = {
    title: RandomGenerator.paragraph()(4),
    pinned: false,
    closed: false,
    description: null,
    discussion_board_category_id: categoryId,
  };
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    { body: topicInput },
  );
  typia.assert(topic);

  // 3. Create a thread with a specific title
  const uniqueThreadTitle = RandomGenerator.paragraph()();
  const threadInput: IDiscussionBoardThreads.ICreate = {
    title: uniqueThreadTitle,
  };
  const thread =
    await api.functional.discussionBoard.admin.topics.threads.create(
      connection,
      { topicId: topic.id, body: threadInput },
    );
  typia.assert(thread);

  // 4. Attempt to create another thread with the same title (should fail with error)
  const duplicateThreadInput: IDiscussionBoardThreads.ICreate = {
    title: uniqueThreadTitle,
  };
  await TestValidator.error("duplicate thread title should fail")(async () => {
    await api.functional.discussionBoard.admin.topics.threads.create(
      connection,
      { topicId: topic.id, body: duplicateThreadInput },
    );
  });
}
