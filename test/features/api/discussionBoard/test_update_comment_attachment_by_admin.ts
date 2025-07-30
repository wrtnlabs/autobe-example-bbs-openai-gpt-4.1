import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate that an admin account can update the metadata for a comment
 * attachment uploaded by a member.
 *
 * This test performs the following workflow:
 *
 * 1. Register a discussion board member (generates unique identifiers)
 * 2. Register an admin with privilege to update attachments
 * 3. Member creates a comment (with random parent post)
 * 4. Member uploads an attachment to the comment
 * 5. Admin updates the attachment's metadata (file_name and file_url)
 * 6. Check that the update is reflected in the returned data, and unchanged fields
 *    (like mime_type, uploader, comment_id) remain stable
 *
 * This assures the business rule that admins can update any comment
 * attachment's metadata, not just their own. It also ensures system integrity
 * for audit/compliance—changes by staff are allowed and logged.
 */
export async function test_api_discussionBoard_test_update_comment_attachment_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a board member (who will upload the original attachment)
  const member_user_identifier = RandomGenerator.alphaNumeric(15);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: member_user_identifier,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Register an admin (who will update attachment)
  const admin_user_identifier = RandomGenerator.alphaNumeric(15);
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: admin_user_identifier,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    },
  );
  typia.assert(admin);

  // 3. Member creates a comment (using a new random post as parent)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: postId,
        content: RandomGenerator.paragraph()(),
      },
    },
  );
  typia.assert(comment);

  // 4. Member uploads an attachment to the comment
  const attachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: member.id,
          file_name: `original_file_${RandomGenerator.alphaNumeric(6)}.txt`,
          file_url: `https://files.example.com/original/${RandomGenerator.alphaNumeric(8)}.txt`,
          mime_type: "text/plain",
        },
      },
    );
  typia.assert(attachment);

  // 5. Admin updates the attachment metadata
  const newFileName = `updated_file_${RandomGenerator.alphaNumeric(6)}.pdf`;
  const newFileUrl = `https://files.example.com/updated/${RandomGenerator.alphaNumeric(10)}.pdf`;
  const updatePayload = {
    file_name: newFileName,
    file_url: newFileUrl,
    // omit mime_type to keep it unchanged
  } satisfies IDiscussionBoardCommentAttachment.IUpdate;
  const updatedAttachment =
    await api.functional.discussionBoard.admin.comments.attachments.update(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedAttachment);

  // 6. Validate updated vs. original fields
  TestValidator.equals("updated file_name")(updatedAttachment.file_name)(
    newFileName,
  );
  TestValidator.equals("updated file_url")(updatedAttachment.file_url)(
    newFileUrl,
  );
  TestValidator.equals("mime_type unchanged")(updatedAttachment.mime_type)(
    attachment.mime_type,
  );
  TestValidator.equals("uploader_member_id unchanged")(
    updatedAttachment.uploader_member_id,
  )(attachment.uploader_member_id);
  TestValidator.equals("comment_id unchanged")(
    updatedAttachment.discussion_board_comment_id,
  )(attachment.discussion_board_comment_id);
}
