import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate that non-admins cannot delete threads and that such attempts do not
 * remove or alter thread data.
 *
 * Business context: Only admin users or moderators are allowed to delete
 * threads in the discussion board. Deleting a thread as a non-admin (e.g.,
 * guest, regular member) must fail with a permission-denied error and must not
 * alter data.
 *
 * Steps:
 *
 * 1. As an admin, create a topic (using POST /discussionBoard/admin/topics).
 * 2. As an admin, create a thread under the topic (using POST
 *    /discussionBoard/admin/topics/{topicId}/threads).
 * 3. Simulate a non-admin session (e.g., invalid/empty authentication) and attempt
 *    to DELETE the thread using
 *    /discussionBoard/admin/topics/{topicId}/threads/{threadId}.
 * 4. Assert that a permission-denied error occurs.
 * 5. As no thread retrieval API is available, thread existence after failed
 *    deletion cannot be directly verified.
 */
export async function test_api_discussionBoard_test_delete_thread_by_admin_without_permission(
  connection: api.IConnection,
) {
  // 1. Admin creates a topic
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        description: null,
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(topic);

  // 2. Admin creates a thread under the topic
  const thread =
    await api.functional.discussionBoard.admin.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(),
        },
      },
    );
  typia.assert(thread);

  // 3. Simulate a non-admin by removing auth headers
  const { Authorization, ...headers } = connection.headers ?? {};
  const guestConnection: api.IConnection = {
    ...connection,
    headers,
  };
  // 4. Attempt to delete as guest/non-admin, assert error
  await TestValidator.error("non-admin cannot delete thread")(
    async () =>
      await api.functional.discussionBoard.admin.topics.threads.erase(
        guestConnection,
        {
          topicId: topic.id,
          threadId: thread.id,
        },
      ),
  );
  // 5. No retrieval API for threads -> can't check for thread's existence post-failure
}
