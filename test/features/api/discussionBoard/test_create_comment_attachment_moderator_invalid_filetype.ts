import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Test that uploading an attachment with an unsupported or forbidden MIME type
 * as a moderator is disallowed by the backend.
 *
 * This test ensures that moderation actions for file uploads are subject to the
 * same blocked/unsupported MIME type validation as regular member uploads.
 *
 * Workflow:
 *
 * 1. Register a new board member as an admin, creating a user able to author a
 *    comment.
 * 2. Create a new comment as a member (using the newly registered member), so we
 *    have a comment to attach to.
 * 3. As a moderator, attempt to upload a file attachment to the comment using a
 *    classic forbidden MIME type (e.g., application/x-msdownload).
 * 4. Validate that the API call fails (using TestValidator.error), confirming that
 *    even moderators cannot bypass file type safety validation.
 */
export async function test_api_discussionBoard_test_create_comment_attachment_moderator_invalid_filetype(
  connection: api.IConnection,
) {
  // 1. Register a new board member as admin
  const memberIdentifier = typia.random<string>();
  const memberJoinTime = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberIdentifier,
        joined_at: memberJoinTime,
      },
    },
  );
  typia.assert(member);

  // 2. Create a comment as a member (must link to a valid post ID)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: postId,
        content: "Comment for forbidden filetype moderation test.",
      },
    },
  );
  typia.assert(comment);

  // 3. As moderator, try to upload a forbidden file type attachment
  // Use a canonical forbidden MIME type, such as 'application/x-msdownload' (Windows executable)
  await TestValidator.error(
    "moderator cannot upload forbidden MIME type attachment",
  )(() =>
    api.functional.discussionBoard.moderator.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: member.id,
          file_name: "malware.exe",
          file_url: "https://example.com/malware.exe",
          mime_type: "application/x-msdownload",
        },
      },
    ),
  );
}
