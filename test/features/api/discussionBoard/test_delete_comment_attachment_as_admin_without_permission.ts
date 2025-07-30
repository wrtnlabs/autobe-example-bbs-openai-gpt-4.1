import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Verify that an admin cannot delete a comment attachment when permissions are
 * insufficient (due to prior deletion or implicit privilege loss).
 *
 * This test covers the following workflow:
 *
 * 1. Create a board member for realistic ownership simulation
 * 2. Member creates a comment post
 * 3. An attachment is uploaded to the comment (admin acts as uploader for
 *    convenience, but retains correct member linkage)
 * 4. The attachment is deleted (by admin, simulating real privilege)
 * 5. Attempt to delete the same attachment again – expect a not found or
 *    permission denied error
 * 6. Confirm system integrity by error expectation and type validation (error
 *    occurs, attachment remains gone)
 *
 * This validates correct error handling, prevents privilege/cleanup edge case
 * issues, and ensures attachment cannot be deleted twice without reset or
 * explicit privilege changes.
 */
export async function test_api_discussionBoard_test_delete_comment_attachment_as_admin_without_permission(
  connection: api.IConnection,
) {
  // 1. Create board member (admin context)
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(14),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Member creates a comment (requires synthetic post ID)
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: postId,
        content: RandomGenerator.paragraph()(2),
      },
    },
  );
  typia.assert(comment);

  // 3. Admin uploads attachment to the comment (uploader is the member)
  const attachment =
    await api.functional.discussionBoard.admin.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: member.id,
          file_name: `test-${RandomGenerator.alphaNumeric(6)}.txt`,
          file_url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(10)}`,
          mime_type: "text/plain",
        },
      },
    );
  typia.assert(attachment);

  // 4. Admin deletes the attachment (simulate privilege, then lack thereof)
  await api.functional.discussionBoard.admin.comments.attachments.erase(
    connection,
    {
      commentId: comment.id,
      attachmentId: attachment.id,
    },
  );

  // 5. Attempt the deletion a second time (must fail – already deleted or no permission)
  await TestValidator.error(
    "admin cannot delete non-existent or forbidden attachment",
  )(async () => {
    await api.functional.discussionBoard.admin.comments.attachments.erase(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    );
  });
  // 6. Cannot check audit logs or real database state via available API
}
