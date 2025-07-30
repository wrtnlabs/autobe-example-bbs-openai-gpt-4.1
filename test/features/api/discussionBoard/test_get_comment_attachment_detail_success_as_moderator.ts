import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate that a moderator can view the detailed metadata of an attachment
 * linked to a comment.
 *
 * This test ensures that after a member creates a comment and uploads an
 * attachment, a moderator can successfully retrieve that attachment's details
 * using its attachmentId and associated commentId. The test checks for correct
 * role-based read access and verifies the referential integrity and
 * completeness of the attachment metadata.
 *
 * Steps:
 *
 * 1. Create a new board member (the uploader).
 * 2. Create a comment under a post as the registered member.
 * 3. Upload a file attachment to the comment as the member; store its metadata and
 *    IDs.
 * 4. As a moderator, retrieve the attachment metadata specifying both commentId
 *    and attachmentId.
 * 5. Assert that all metadata fields (file name, URI, uploader, mime type,
 *    timestamps, etc) match what was uploaded.
 */
export async function test_api_discussionBoard_test_get_comment_attachment_detail_success_as_moderator(
  connection: api.IConnection,
) {
  // 1. Create a new discussion board member (the uploader)
  const joinTime = new Date().toISOString();
  const userIdentifier = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: userIdentifier,
        joined_at: joinTime,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a comment under a post as the registered member
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentContent = RandomGenerator.content()()();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: postId,
        content: commentContent,
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Upload an attachment as the member; store its metadata and IDs
  const fileName = `test-file-${RandomGenerator.alphaNumeric(5)}.png`;
  const fileUrl = `https://cdn.example.com/${RandomGenerator.alphaNumeric(10)}`;
  const mimeType = "image/png";
  const attachmentInput = {
    discussion_board_comment_id: comment.id,
    uploader_member_id: member.id,
    file_name: fileName,
    file_url: fileUrl,
    mime_type: mimeType,
  } satisfies IDiscussionBoardCommentAttachment.ICreate;
  const attachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 4. As moderator, retrieve the attachment metadata by commentId and attachmentId
  const retrievedMetadata =
    await api.functional.discussionBoard.moderator.comments.attachments.at(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(retrievedMetadata);

  // 5. Assert that all relevant metadata fields match the attachment created step
  TestValidator.equals("file_name")(retrievedMetadata.file_name)(fileName);
  TestValidator.equals("file_url")(retrievedMetadata.file_url)(fileUrl);
  TestValidator.equals("mime_type")(retrievedMetadata.mime_type)(mimeType);
  TestValidator.equals("uploader_member_id")(
    retrievedMetadata.uploader_member_id,
  )(member.id);
  TestValidator.equals("discussion_board_comment_id")(
    retrievedMetadata.discussion_board_comment_id,
  )(comment.id);
}
