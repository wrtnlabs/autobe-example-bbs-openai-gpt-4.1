import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate deletion of a comment attachment by an admin user with valid
 * permissions.
 *
 * This test ensures that when an admin invokes the delete-attachment API, the
 * targeted attachment record is properly removed, and it is no longer
 * accessible via retrieval mechanisms (e.g., listing attachments for the
 * comment). The setup will:
 *
 * 1. Create a new discussion board member (simulating a normal user account).
 * 2. This member (by id) creates a comment linked to a parent post (with a random
 *    UUID, as posts are not in test scope).
 * 3. An attachment is uploaded to the created comment using the admin endpoint
 *    (emulating moderator powers).
 * 4. Verify the attachment exists after creation (via output record contents).
 * 5. Admin calls the delete API for this attachment and comment.
 * 6. (If query endpoints existed, they would confirm attachment is now gone; in
 *    this context, ensure no errors and types are correct.)
 * 7. (Operation is considered successful if no errors and system types are
 *    asserted throughout.)
 *
 * This test ensures only valid, existing attachments can be deleted and that
 * admin users have the authority to perform the operation. For complete
 * integrity, an implementation with attachment-list retrieval and audit log
 * APIs would be required to fully verify removal and compliance, but these are
 * omitted if not in test scope.
 */
export async function test_api_discussionBoard_test_delete_comment_attachment_as_admin_with_valid_permissions(
  connection: api.IConnection,
) {
  // 1. Create a board member (admin-level action)
  const member_input: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphaNumeric(12),
    joined_at: new Date().toISOString(),
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: member_input },
  );
  typia.assert(member);

  // 2. Member creates a comment (random post id, simulating parent post context)
  const parent_post_id = typia.random<string & tags.Format<"uuid">>();
  const comment_input: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: member.id,
    discussion_board_post_id: parent_post_id,
    content: RandomGenerator.paragraph()(),
  };
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    { body: comment_input },
  );
  typia.assert(comment);

  // 3. Upload attachment as admin for this comment
  const attachment_input: IDiscussionBoardCommentAttachment.ICreate = {
    discussion_board_comment_id: comment.id,
    uploader_member_id: member.id,
    file_name: RandomGenerator.alphaNumeric(8) + ".png",
    file_url: "https://cdn.example.com/" + RandomGenerator.alphaNumeric(16),
    mime_type: "image/png",
  };
  const attachment =
    await api.functional.discussionBoard.admin.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: attachment_input,
      },
    );
  typia.assert(attachment);
  TestValidator.equals("attachment parent links")(
    attachment.discussion_board_comment_id,
  )(comment.id);
  TestValidator.equals("attachment uploader")(attachment.uploader_member_id)(
    member.id,
  );

  // 4. Delete the attachment as admin
  await api.functional.discussionBoard.admin.comments.attachments.erase(
    connection,
    {
      commentId: comment.id,
      attachmentId: attachment.id,
    },
  );

  // 5. (No attachment list API to check removal; if existed, would query and check for absence here.)
  // Operation is successful if no errors thrown and all above type asserts succeed.
}
