import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Test attaching a file to a member's own comment as a registered member
 * (success case).
 *
 * This verifies that a registered member can upload a valid attachment to their
 * own comment and that the returned attachment data links correctly to both the
 * comment and uploader, with accurate metadata.
 *
 * 1. Register a new member (simulate as admin onboarding)
 * 2. Create a comment as this member (simulate a post context with a random parent
 *    post UUID)
 * 3. Upload an allowed file (e.g., image/png) attachment to that comment using
 *    their member ID as uploader
 * 4. Validate that the response metadata (file_name, mime_type,
 *    uploader_member_id, file_url, etc.) matches input
 * 5. Confirm that the returned comment ID/reference matches the created comment
 */
export async function test_api_discussionBoard_test_create_comment_attachment_success_as_member(
  connection: api.IConnection,
) {
  // 1. Register a new member via admin endpoint
  const userIdentifier: string = RandomGenerator.alphaNumeric(12);
  const joinedAt: string = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: userIdentifier,
        joined_at: joinedAt,
      },
    },
  );
  typia.assert(member);

  // 2. Create a comment as this member
  const parentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const commentContent: string = RandomGenerator.paragraph()();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: parentPostId,
        content: commentContent,
      },
    },
  );
  typia.assert(comment);
  TestValidator.equals("comment authored by member")(
    comment.discussion_board_member_id,
  )(member.id);

  // 3. Prepare and upload the file attachment
  const fileName: string = `test_image_${RandomGenerator.alphaNumeric(6)}.png`;
  const fileUrl: string = `https://cdn.example.com/test/${RandomGenerator.alphaNumeric(8)}.png`;
  const mimeType: string = "image/png";
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

  // 4. Validate: metadata and linkages are correct
  TestValidator.equals("attached comment id")(
    attachment.discussion_board_comment_id,
  )(comment.id);
  TestValidator.equals("uploader matches member")(
    attachment.uploader_member_id,
  )(member.id);
  TestValidator.equals("file name matches")(attachment.file_name)(fileName);
  TestValidator.equals("file url matches")(attachment.file_url)(fileUrl);
  TestValidator.equals("mime type matches")(attachment.mime_type)(mimeType);
  TestValidator.predicate("attachment id is uuid")(
    typeof attachment.id === "string" && attachment.id.length > 10,
  );
  TestValidator.predicate("upload timestamp is ISO8601")(
    typeof attachment.uploaded_at === "string" &&
      attachment.uploaded_at.includes("T"),
  );
}
