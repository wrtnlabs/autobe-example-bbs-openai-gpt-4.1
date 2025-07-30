import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate that a moderator can attach a file to any comment, including
 * comments they did not author, verifying cross-role attachment functionality
 * and complete audit trail recording.
 *
 * This test simulates a real business scenario where a moderator may need to
 * add evidence, corrections, or externally sourced materials to a member's
 * comment for compliance, dispute resolution, or moderation.
 *
 * Steps:
 *
 * 1. Register a new board member via admin endpoint (simulate user onboarding)
 * 2. As that member, create a comment on some post (using a random post id)
 * 3. As moderator, upload a file attachment to that comment specifying yourself as
 *    uploader
 * 4. Validate the attachment response:
 *
 *    - The attachment record references the correct comment and uploader
 *    - All mandatory metadata (filename, url, mime type, uploaded_at) is present and
 *         correctly formatted
 *    - The attachment record can be traced to both the member comment and the
 *         moderator uploader id
 */
export async function test_api_discussionBoard_test_create_comment_attachment_as_moderator(
  connection: api.IConnection,
) {
  // 1. Register a new board member via admin endpoint (simulate user onboarding)
  const memberUserIdentifier = typia.random<string>();
  const memberJoinTime = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberUserIdentifier,
        joined_at: memberJoinTime,
      },
    },
  );
  typia.assert(member);

  // 2. As that member, create a comment (use a random post id for the test)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentBody: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: member.id,
    discussion_board_post_id: postId,
    content: RandomGenerator.paragraph()(),
  };
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    { body: commentBody },
  );
  typia.assert(comment);

  // 3. As moderator, attach a file to the comment (simulate moderator id as uploader)
  // We'll generate a new moderator record to simulate this, or reuse the member id if no explicit moderator session switching is available.
  const moderatorUserIdentifier = typia.random<string>();
  const moderatorJoinTime = new Date().toISOString();
  const moderator = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: moderatorUserIdentifier,
        joined_at: moderatorJoinTime,
      },
    },
  );
  typia.assert(moderator);

  const attachmentInput: IDiscussionBoardCommentAttachment.ICreate = {
    discussion_board_comment_id: comment.id,
    uploader_member_id: moderator.id,
    file_name: RandomGenerator.alphabets(10) + ".txt",
    file_url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}`,
    mime_type: "text/plain",
  };
  const attachment =
    await api.functional.discussionBoard.moderator.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 4. Validate
  //   a. The attachment's comment id and uploader id match the intended ones
  TestValidator.equals("attachment references correct comment")(
    attachment.discussion_board_comment_id,
  )(comment.id);
  TestValidator.equals("attachment uploader is moderator")(
    attachment.uploader_member_id,
  )(moderator.id);
  //   b. File metadata is present and correctly formatted
  TestValidator.equals("file_name matches")(attachment.file_name)(
    attachmentInput.file_name,
  );
  TestValidator.equals("file_url matches")(attachment.file_url)(
    attachmentInput.file_url,
  );
  TestValidator.equals("mime_type matches")(attachment.mime_type)(
    attachmentInput.mime_type,
  );
  //   c. uploaded_at is a valid ISO8601 string
  TestValidator.predicate("uploaded_at is ISO8601 date")(
    !isNaN(Date.parse(attachment.uploaded_at)),
  );
}
