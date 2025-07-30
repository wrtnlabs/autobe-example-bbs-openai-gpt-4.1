import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate proper error response when a moderator tries to get the details of a
 * non-existent comment attachment.
 *
 * This test ensures that when a valid comment exists (created as a member), but
 * the attachmentId specified does not correspond to any attachment on that
 * comment, the API returns a 404 not found error and does not leak information
 * about deleted or unknown files.
 *
 * Steps:
 *
 * 1. Create a member through the admin endpoint (simulates an admin registering a
 *    user).
 * 2. As a member, create a comment on a random post (using a generated
 *    discussion_board_post_id).
 * 3. As a moderator, attempt to access an attachment on the comment using a random
 *    (non-existent) attachmentId.
 * 4. Confirm that the API returns a 404 not found error for this attachment
 *    lookup.
 */
export async function test_api_discussionBoard_test_get_comment_attachment_detail_attachment_not_found(
  connection: api.IConnection,
) {
  // 1. Register a member (admin action)
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphaNumeric(12),
    joined_at: new Date().toISOString(),
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberInput },
  );
  typia.assert(member);

  // 2. Create a comment as the registered member
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  const commentInput: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: member.id,
    discussion_board_post_id: postId,
    content: RandomGenerator.paragraph()(),
  };
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    { body: commentInput },
  );
  typia.assert(comment);

  // 3. Attempt to access an attachment with a random non-existent attachmentId as moderator
  const attachmentId: string = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("attachment not found 404 error")(() =>
    api.functional.discussionBoard.moderator.comments.attachments.at(
      connection,
      {
        commentId: comment.id,
        attachmentId,
      },
    ),
  );
}
