import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate that a member can delete their own comment attachment.
 *
 * This test covers the workflow where a registered board member uploads and
 * then deletes their own comment attachment. It verifies:
 *
 * 1. A member can create a comment and upload an attachment to it as the
 *    owner/uploader.
 * 2. The member can successfully delete that attachment via the accordance API.
 * 3. Once deleted, further attempts to delete the same attachment result in an
 *    error – demonstrating it is removed from the system and cannot be
 *    retrieved.
 *
 * Steps:
 *
 * 1. Register a new discussion board member (admin-only route).
 * 2. As this member, create a comment on a (simulated) post.
 * 3. Upload a file attachment to the newly created comment, as the
 *    member/uploader.
 * 4. Delete that same attachment as the owner.
 * 5. Attempt to re-delete to confirm effective removal.
 */
export async function test_api_discussionBoard_test_delete_comment_attachment_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a member (admin-only)
  const joinTime: string = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(8),
        joined_at: joinTime,
      },
    },
  );
  typia.assert(member);

  // 2. Create a comment, referencing a (random) parent post id
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.content()()(),
      },
    },
  );
  typia.assert(comment);

  // 3. Upload an attachment to the comment (as this member)
  const attachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: member.id,
          file_name: `test_${RandomGenerator.alphaNumeric(5)}.txt`,
          file_url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(10)}`,
          mime_type: "text/plain",
        },
      },
    );
  typia.assert(attachment);

  // 4. Delete the uploaded attachment as the owner
  await api.functional.discussionBoard.member.comments.attachments.erase(
    connection,
    {
      commentId: comment.id,
      attachmentId: attachment.id,
    },
  );

  // 5. Attempt to delete again: error expected
  await TestValidator.error("Deleting a non-existent attachment must fail")(
    () =>
      api.functional.discussionBoard.member.comments.attachments.erase(
        connection,
        {
          commentId: comment.id,
          attachmentId: attachment.id,
        },
      ),
  );
}
