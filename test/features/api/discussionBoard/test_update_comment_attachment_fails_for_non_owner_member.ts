import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validates that only the owner (uploader) of a comment's attachment can update
 * its metadata.
 *
 * This test ensures that unauthorized modification of another member's
 * attachment by a different member is correctly rejected by the system.
 *
 * Test Steps:
 *
 * 1. Create member A (the owner/uploader) and member B (the non-owner).
 * 2. Member A creates a comment under a randomly chosen post.
 * 3. Member A uploads an attachment to their comment.
 * 4. Member B (who did not upload the attachment) attempts to update the
 *    attachment's metadata.
 * 5. Confirm that this update attempt fails with a permission-denied or
 *    authorization error (error is thrown or returned by API).
 *
 * This test validates strict ownership controls in the discussion board and
 * mitigates improper file alterations by others.
 */
export async function test_api_discussionBoard_test_update_comment_attachment_fails_for_non_owner_member(
  connection: api.IConnection,
) {
  // 1. Create member A (owner) and member B (non-owner)
  const memberA: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(10),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(memberA);

  const memberB: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(10),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(memberB);

  // 2. Member A creates a comment under a post (simulate a random post id)
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: {
        discussion_board_member_id: memberA.id,
        discussion_board_post_id: postId,
        content: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(comment);

  // 3. Member A uploads an attachment to this comment
  const attachment: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: memberA.id,
          file_name: `${RandomGenerator.alphaNumeric(6)}.jpg`,
          file_url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}`,
          mime_type: "image/jpeg",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Member B attempts to update metadata of member A's attachment (should fail)
  await TestValidator.error("non-owner cannot update attachment")(async () => {
    await api.functional.discussionBoard.member.comments.attachments.update(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
        body: {
          file_name: "malicious_change.txt",
          file_url: `https://malicious.example.com/${RandomGenerator.alphaNumeric(16)}`,
          mime_type: "text/plain",
        } satisfies IDiscussionBoardCommentAttachment.IUpdate,
      },
    );
  });
}
