import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";

/**
 * Validate update of file metadata for a post attachment by the owning member.
 *
 * This test simulates the full workflow of an authenticated member creating a
 * post in a thread, uploading an attachment file, and then updating specific
 * metadata (such as file name) for that attachment. The goal is to confirm
 * ownership enforcement and successful propagation of allowed metadata
 * updates.
 *
 * Steps:
 *
 * 1. Prepare thread and member context (assume thread exists or use random UUID
 *    for threadId).
 * 2. Member creates a post in the specified thread.
 * 3. Member uploads an attachment to the post via POST.
 * 4. Member updates the attachment's file name using the PUT endpoint—only
 *    permissible metadata should be updated (e.g., file_name).
 * 5. Validate:
 *
 *    - The returned object reflects the updated metadata (e.g., name changed).
 *    - All immutable fields (post, uploader IDs, uploaded_at, etc.) remain
 *         unchanged.
 */
export async function test_api_discussionBoard_test_update_post_attachment_metadata_as_owner(
  connection: api.IConnection,
) {
  // 1. Create a new post under a thread (simulate threadId generation)
  const threadId: string = typia.random<string & tags.Format<"uuid">>();
  const postBody: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: threadId,
    body: RandomGenerator.paragraph()(),
  };
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: postBody,
    },
  );
  typia.assert(post);

  // 2. Member uploads an attachment for the post
  const attachmentCreate: IDiscussionBoardPostAttachment.ICreate = {
    discussion_board_post_id: post.id,
    uploader_member_id: post.creator_member_id,
    file_uri: RandomGenerator.alphaNumeric(16),
    file_name: `original-${RandomGenerator.alphaNumeric(8)}`,
    mime_type: "application/pdf",
  };
  const attachment =
    await api.functional.discussionBoard.member.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: attachmentCreate,
      },
    );
  typia.assert(attachment);

  // 3. Member updates file_name of the attachment (allowed metadata field)
  const newFileName = `updated-${RandomGenerator.alphaNumeric(8)}`;
  const updated =
    await api.functional.discussionBoard.member.posts.attachments.update(
      connection,
      {
        postId: post.id,
        attachmentId: attachment.id,
        body: {
          file_name: newFileName,
        },
      },
    );
  typia.assert(updated);
  // Validate: file_name changed, immutable fields unchanged
  TestValidator.equals("updated file name")(updated.file_name)(newFileName);
  TestValidator.equals("post id unchanged")(updated.discussion_board_post_id)(
    attachment.discussion_board_post_id,
  );
  TestValidator.equals("uploader unchanged")(updated.uploader_member_id)(
    attachment.uploader_member_id,
  );
  TestValidator.equals("file_uri unchanged")(updated.file_uri)(
    attachment.file_uri,
  );
  TestValidator.equals("mime_type unchanged")(updated.mime_type)(
    attachment.mime_type,
  );
  TestValidator.equals("uploaded_at unchanged")(updated.uploaded_at)(
    attachment.uploaded_at,
  );
}
