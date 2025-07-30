import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Test updating the metadata of a comment attachment by the original uploader.
 *
 * This test covers the case where a member uploads an attachment to their own
 * comment and subsequently updates allowed modifiable fields (such as file
 * name, URI, or MIME type) using the provided API. The flow ensures that only
 * permitted fields are changed, and immutable properties (such as
 * 'uploaded_at', 'uploader_member_id', etc.) are preserved.
 *
 * Step-by-step process:
 *
 * 1. Create a board member (admin API)
 * 2. Create a comment as that member (member API)
 * 3. Upload an attachment to the comment (member API)
 * 4. Update modifiable metadata of the attachment (member API)
 * 5. Validate operation success and ensure only allowed fields have changed;
 *    immutable fields remain consistent
 */
export async function test_api_discussionBoard_test_update_comment_attachment_by_owner_with_valid_metadata(
  connection: api.IConnection,
) {
  // 1. Create a member using admin API
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphaNumeric(10),
    joined_at: new Date().toISOString(),
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberInput },
  );
  typia.assert(member);

  // 2. Create a new comment as the member
  const commentInput: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: member.id,
    discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
    content: RandomGenerator.paragraph()(),
  };
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    { body: commentInput },
  );
  typia.assert(comment);

  // 3. Upload an attachment to the comment as the same member
  const attachmentCreateInput: IDiscussionBoardCommentAttachment.ICreate = {
    discussion_board_comment_id: comment.id,
    uploader_member_id: member.id,
    file_name: `original_${RandomGenerator.alphabets(6)}.jpg`,
    file_url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(12)}.jpg`,
    mime_type: "image/jpeg",
  };
  const attachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      { commentId: comment.id, body: attachmentCreateInput },
    );
  typia.assert(attachment);

  // 4. Update the modifiable metadata fields
  const updatedFileName = `updated_${RandomGenerator.alphabets(6)}.jpg`;
  const updatedFileUrl = `https://cdn.example.com/${RandomGenerator.alphaNumeric(14)}.jpg`;
  const updatedMimeType = "image/png";
  const updateInput: IDiscussionBoardCommentAttachment.IUpdate = {
    file_name: updatedFileName,
    file_url: updatedFileUrl,
    mime_type: updatedMimeType,
  };
  const updatedAttachment =
    await api.functional.discussionBoard.member.comments.attachments.update(
      connection,
      { commentId: comment.id, attachmentId: attachment.id, body: updateInput },
    );
  typia.assert(updatedAttachment);

  // 5. Validation -- Only allowed fields changed, immutable remain
  TestValidator.equals("id unchanged")(updatedAttachment.id)(attachment.id);
  TestValidator.equals("comment id unchanged")(
    updatedAttachment.discussion_board_comment_id,
  )(attachment.discussion_board_comment_id);
  TestValidator.equals("uploader unchanged")(
    updatedAttachment.uploader_member_id,
  )(attachment.uploader_member_id);
  TestValidator.equals("uploaded_at unchanged")(updatedAttachment.uploaded_at)(
    attachment.uploaded_at,
  );

  TestValidator.equals("file name updated")(updatedAttachment.file_name)(
    updatedFileName,
  );
  TestValidator.equals("file url updated")(updatedAttachment.file_url)(
    updatedFileUrl,
  );
  TestValidator.equals("mime type updated")(updatedAttachment.mime_type)(
    updatedMimeType,
  );
}
