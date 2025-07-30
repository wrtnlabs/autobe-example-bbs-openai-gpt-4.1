import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate error handling when requesting an attachment with an invalid or
 * unrelated attachmentId.
 *
 * This E2E test ensures the backend properly enforces referential integrity
 * between commentId and attachmentId. When a member attempts to fetch
 * attachment details for a comment (via GET
 * /discussionBoard/member/comments/{commentId}/attachments/{attachmentId}), but
 * the given attachmentId either does not exist or does not belong to the
 * comment, the API must respond with an appropriate error (not found or
 * referential integrity failure).
 *
 * Steps:
 *
 * 1. Create a comment as a member (for which attachments are referenced)
 * 2. Attempt to fetch attachment details using that comment's id and a
 *    random/invalid/nonexistent attachmentId
 * 3. Validate that an error is thrown (not found or referential integrity failure)
 */
export async function test_api_discussionBoard_test_get_comment_attachment_detail_invalid_attachment_id(
  connection: api.IConnection,
) {
  // 1. Create a comment as a member (setup base data)
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph()(),
      },
    },
  );
  typia.assert(comment);

  // 2. Attempt to fetch attachment details for this comment using an invalid attachmentId
  const invalidAttachmentId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.error(
    "API should error if attachmentId does not exist or does not belong to comment",
  )(async () => {
    await api.functional.discussionBoard.member.comments.attachments.at(
      connection,
      {
        commentId: comment.id,
        attachmentId: invalidAttachmentId,
      },
    );
  });
}
