import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate that deleting a non-existent attachmentId as an admin returns an
 * error, and that the existing post and (if implemented) attachments remain
 * unaffected.
 *
 * Business context:
 *
 * - Admins can attempt to delete an attachment from a discussion board post, but
 *   if the attachmentId does not exist for the given post, an error should be
 *   returned.
 * - This protects integrity of unrelated attachments and confirms the
 *   error-handling path.
 *
 * Steps:
 *
 * 1. Create a discussion topic as a member
 * 2. Create a thread within that topic
 * 3. Create a post within that thread
 * 4. Attempt to delete a non-existent attachment as an admin—should fail
 * 5. (Optional) Re-fetch or validate that the post/attachments remain—but SDK
 *    offers no direct attachment list or post retrieval by id, so skipped
 */
export async function test_api_discussionBoard_test_delete_post_attachment_by_admin_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Create a topic
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        description: RandomGenerator.paragraph()(2),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 2. Create a thread under the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(2),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 3. Create a post within the thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.paragraph()(3),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Attempt to delete a non-existent attachment as admin—should yield error
  await TestValidator.error("deleting non-existent attachment should throw")(
    () =>
      api.functional.discussionBoard.admin.posts.attachments.erase(connection, {
        postId: post.id,
        attachmentId: typia.random<string & tags.Format<"uuid">>(),
      }),
  );
  // 5. No further checks possible for attachments or post (no compatible API provided)
}
