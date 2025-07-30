import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate that an admin user can successfully delete a thread from a topic and
 * confirm permanent removal.
 *
 * Business context:
 *
 * - Only admins (or moderators) can delete threads. Deletion is permanent and
 *   cascades to all posts under the thread. This ensures the moderation
 *   integrity of the discussion board platform.
 *
 * Test Workflow:
 *
 * 1. Create a discussion topic as an admin user.
 * 2. Create a thread in the topic as admin.
 * 3. Delete the thread via admin endpoint.
 * 4. Attempt to delete the same thread again; expect an error (thread should no
 *    longer exist).
 * 5. All steps use type-safe data and validate contract compliance.
 */
export async function test_api_discussionBoard_test_delete_thread_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Create a discussion topic as admin
  const topic: IDiscussionBoardTopics =
    await api.functional.discussionBoard.admin.topics.create(connection, {
      body: {
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    });
  typia.assert(topic);

  // 2. Create a thread under the created topic
  const thread: IDiscussionBoardThreads =
    await api.functional.discussionBoard.admin.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 3. Delete the thread as admin
  await api.functional.discussionBoard.admin.topics.threads.erase(connection, {
    topicId: topic.id,
    threadId: thread.id,
  });

  // 4. Attempt to delete again — should return an error because the thread is already deleted.
  await TestValidator.error("deleting already deleted thread should fail")(() =>
    api.functional.discussionBoard.admin.topics.threads.erase(connection, {
      topicId: topic.id,
      threadId: thread.id,
    }),
  );
}
