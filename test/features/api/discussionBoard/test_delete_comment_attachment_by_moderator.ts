import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate that a moderator can delete a comment attachment uploaded by any
 * user.
 *
 * This test ensures that, regardless of who uploaded the file attachment for a
 * comment, a moderator role is able to remove (hard-delete) this attachment as
 * per business compliance and audit requirements. The test covers both the
 * positive scenario (moderator deletes successfully) and verifies the deletion
 * is effective.
 *
 * Step-by-step process:
 *
 * 1. Create a member (who will upload the attachment and own the comment)
 * 2. Create a moderator
 * 3. Member creates a comment
 * 4. Member uploads an attachment to the comment
 * 5. Moderator deletes the attachment by ID
 * 6. (If possible) Confirm the attachment is deleted (re-deletion should error)
 *
 * Note: Actual audit/compliance log verification is omitted as no direct check
 * exists in provided APIs.
 */
export async function test_api_discussionBoard_test_delete_comment_attachment_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create a member who will upload the attachment and own the comment
  const member_user_identifier = RandomGenerator.alphabets(16);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: member_user_identifier,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a moderator
  const moderator_user_identifier = RandomGenerator.alphabets(16);
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderator_user_identifier,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Member creates a comment (simulate a post ID as random UUID)
  const fake_post_id = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: fake_post_id,
        content: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 4. Member uploads an attachment to their comment
  const attachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: member.id,
          file_name: `test-${RandomGenerator.alphabets(8)}.png`,
          file_url: `https://cdn.example.com/fake/${RandomGenerator.alphaNumeric(12)}`,
          mime_type: "image/png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 5. Moderator deletes the attachment (by ID)
  await api.functional.discussionBoard.moderator.comments.attachments.erase(
    connection,
    {
      commentId: comment.id,
      attachmentId: attachment.id,
    },
  );

  // 6. Try to delete again, should error (confirms deletion was hard and complete)
  await TestValidator.error("attachment should be gone after deletion")(() =>
    api.functional.discussionBoard.moderator.comments.attachments.erase(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    ),
  );
}
