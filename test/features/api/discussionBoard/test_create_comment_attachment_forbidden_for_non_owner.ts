import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Test that members cannot add attachments to comments they do not own
 * (forbidden action).
 *
 * This test covers the following workflow:
 *
 * 1. Register two distinct board members via admin.
 * 2. First member creates a comment (as the target comment owner).
 * 3. Second member attempts to add an attachment to the first member's comment.
 * 4. Verify that the API responds with a forbidden error and prevents the
 *    unauthorized action.
 *
 * This validates business logic enforcing comment ownership on attachment
 * creation, so only the comment's author (member) may upload attachments.
 */
export async function test_api_discussionBoard_test_create_comment_attachment_forbidden_for_non_owner(
  connection: api.IConnection,
) {
  // 1. Register two distinct members
  const ownerIdentifier = RandomGenerator.alphaNumeric(10);
  const secondIdentifier = RandomGenerator.alphaNumeric(10);
  const joinedAt = new Date().toISOString();

  const ownerMember = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: ownerIdentifier,
        joined_at: joinedAt,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(ownerMember);

  const secondMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: secondIdentifier,
        joined_at: joinedAt,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(secondMember);

  // 2. Owner creates a comment
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: ownerMember.id,
        discussion_board_post_id: postId,
        content: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Second member attempts to add an attachment to the owner's comment
  // (Simulate as if secondMember is the authorized uploader; in a real system, this could require token/session switching)
  const attachmentInput = {
    discussion_board_comment_id: comment.id,
    uploader_member_id: secondMember.id,
    file_name: `${RandomGenerator.alphaNumeric(8)}.jpg`,
    file_url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}`,
    mime_type: "image/jpeg",
  } satisfies IDiscussionBoardCommentAttachment.ICreate;

  await TestValidator.error(
    "Non-owner should not be able to add attachment to another member's comment",
  )(() =>
    api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: attachmentInput,
      },
    ),
  );
}
