import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Confirm hard deletion of a post attachment by an admin, regardless of
 * uploader or post ownership.
 *
 * Business context: In community forums, attachments may contain sensitive or
 * inappropriate content. Admins require elevated privileges to hard-delete any
 * attachment, not just their own, to enforce board policy and compliance. This
 * test ensures that hard deletion works across all roles and performs as
 * expected in terms of record and visibility.
 *
 * Process overview:
 *
 * 1. Create a topic as a member.
 * 2. Create a thread under this topic.
 * 3. Create a post within the thread.
 * 4. Upload an attachment for the post (simulate as member uploader).
 * 5. Hard-delete the attachment as an admin user.
 * 6. Confirm the attachment no longer exists (by attempting to delete again and
 *    expecting an error).
 *
 * Notes:
 *
 * - Use realistic random data for all required fields except relationships, which
 *   reference previous steps' outputs.
 * - If an attachment listing or detail API existed, further verification could be
 *   performed, but currently, the only feasible check is to assert a redundant
 *   delete errors or is a no-op.
 */
export async function test_api_discussionBoard_test_delete_post_attachment_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Create topic as member
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.paragraph()(1),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 2. Create thread under topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(1),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 3. Create post in thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Upload attachment as member
  const attachment =
    await api.functional.discussionBoard.member.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          discussion_board_post_id: post.id,
          uploader_member_id: post.creator_member_id,
          file_uri: RandomGenerator.alphabets(24),
          file_name: RandomGenerator.alphaNumeric(10),
          mime_type: "application/octet-stream",
        } satisfies IDiscussionBoardPostAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 5. Hard-delete the attachment as admin (assume connection has admin privilege)
  await api.functional.discussionBoard.admin.posts.attachments.erase(
    connection,
    {
      postId: post.id,
      attachmentId: attachment.id,
    },
  );

  // 6. Attempt redundant delete should error (attachment is already gone)
  await TestValidator.error(
    "Attachment should no longer exist after admin hard delete",
  )(() =>
    api.functional.discussionBoard.admin.posts.attachments.erase(connection, {
      postId: post.id,
      attachmentId: attachment.id,
    }),
  );
}
