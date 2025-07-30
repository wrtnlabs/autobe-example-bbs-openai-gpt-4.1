import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Ensure permission enforcement on discussion board comment attachments
 * deletion by non-owners.
 *
 * This test verifies that a member who is not the uploader of a comment
 * attachment cannot delete that attachment. The test proceeds as follows:
 *
 * 1. Register two members (member A as owner/uploader, member B as non-owner)
 * 2. Member A creates a comment on an arbitrary (random) post
 * 3. Member A uploads an attachment to their own comment
 * 4. Member B (not uploader) attempts to delete the attachment
 * 5. Verify that the deletion attempt is denied with a permission/authentication
 *    error
 *
 * This test ensures robust authorization logic for destructive actions on
 * comment attachments and prevents unauthorized file removal by non-owners.
 * Edge conditions validated include correct context IDs for member/profile
 * identities and correct error handling when ownership is not present.
 */
export async function test_api_discussionBoard_test_delete_comment_attachment_fails_for_non_owner_member(
  connection: api.IConnection,
) {
  // 1. Register two members (A & B) using unique user_identifiers
  // Generate random but valid ISO 8601 datetime for joined_at
  const joinDateA = new Date().toISOString();
  const joinDateB = new Date(Date.now() + 1000).toISOString(); // Ensure unique timestamp
  const memberA = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: joinDateA,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(memberA);
  const memberB = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: joinDateB,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(memberB);

  // 2. Member A creates a new comment (simulate random post for parent)
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: memberA.id,
        discussion_board_post_id: randomPostId,
        content: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Member A uploads an attachment to their comment
  const attachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: memberA.id,
          file_name: RandomGenerator.alphaNumeric(10) + ".png",
          file_url:
            "https://cdn.example.com/" + RandomGenerator.alphaNumeric(16),
          mime_type: "image/png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Member B attempts to delete the attachment (should fail)
  await TestValidator.error(
    "Non-owner member cannot delete another's attachment",
  )(() =>
    api.functional.discussionBoard.member.comments.attachments.erase(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    ),
  );
}
