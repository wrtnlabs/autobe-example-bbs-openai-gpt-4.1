import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate that a moderator can update metadata of a comment attachment not
 * uploaded by themselves.
 *
 * 1. Create a member account (owner of the comment and attachment).
 * 2. Create a moderator account (who will update the attachment).
 * 3. Member creates a comment under a random post.
 * 4. Member uploads an attachment to their comment.
 * 5. Moderator updates the attachment's metadata (file_name, file_url, mime_type).
 * 6. Assert identifiers don't change and updated metadata is reflected.
 */
export async function test_api_discussionBoard_test_update_comment_attachment_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create a member account
  const memberUserIdentifier = RandomGenerator.alphaNumeric(12);
  const memberJoinTime = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberUserIdentifier,
        joined_at: memberJoinTime,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a moderator account
  const moderatorUserIdentifier = RandomGenerator.alphaNumeric(12);
  const moderatorGrantTime = new Date().toISOString();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderatorUserIdentifier,
        granted_at: moderatorGrantTime,
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Member creates a comment (under a simulated post UUID)
  const discussion_board_post_id = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id,
        content: RandomGenerator.paragraph()(40),
      } satisfies IDiscussionBoardComment.ICreate,
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
          file_name: "original_file.jpg",
          file_url: "https://cdn.example.com/original.jpg",
          mime_type: "image/jpeg",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 5. Moderator updates the attachment's metadata
  const updatedFileName = "moderator_updated_file.png";
  const updatedFileUrl = "https://cdn.example.com/updated.png";
  const updatedMimeType = "image/png";
  const result =
    await api.functional.discussionBoard.moderator.comments.attachments.update(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
        body: {
          file_name: updatedFileName,
          file_url: updatedFileUrl,
          mime_type: updatedMimeType,
        } satisfies IDiscussionBoardCommentAttachment.IUpdate,
      },
    );
  typia.assert(result);

  // 6. Validate update
  TestValidator.equals("attachment id unchanged")(result.id)(attachment.id);
  TestValidator.equals("comment id unchanged")(
    result.discussion_board_comment_id,
  )(comment.id);
  TestValidator.equals("uploader id unchanged")(result.uploader_member_id)(
    member.id,
  );
  TestValidator.equals("file name updated")(result.file_name)(updatedFileName);
  TestValidator.equals("file url updated")(result.file_url)(updatedFileUrl);
  TestValidator.equals("mime type updated")(result.mime_type)(updatedMimeType);
  TestValidator.notEquals("upload time should not be null")(result.uploaded_at)(
    null,
  );
}
