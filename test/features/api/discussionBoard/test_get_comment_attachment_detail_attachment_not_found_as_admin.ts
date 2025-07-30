import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate not-found error handling when an admin requests a nonexistent
 * attachment for a comment.
 *
 * This test verifies that the system correctly returns a 404 (or not found)
 * error when an administrator attempts to fetch details of a comment attachment
 * with an attachmentId that does not exist under a known, created comment. It
 * ensures that no sensitive metadata or partial data is leaked in error
 * responses, and compliance with proper error boundary handling.
 *
 * Test steps:
 *
 * 1. Register a new board member as admin via the admin endpoint.
 * 2. Create a comment as a member (using a valid member's id from step 1).
 * 3. Attempt to fetch an attachment for this comment using a random (nonexistent)
 *    UUID as attachmentId via the admin attachment detail endpoint.
 * 4. Assert that the endpoint throws a not found (404) error, indicating no such
 *    attachment exists, and that no metadata of the comment or (especially)
 *    nonexistent attachment is leaked.
 *
 * This covers a critical negative test case for attachment lookup and error
 * handling by administrators.
 */
export async function test_api_discussionBoard_test_get_comment_attachment_detail_attachment_not_found_as_admin(
  connection: api.IConnection,
) {
  // 1. Register a new board member as admin
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Create a comment as a member (assigning the correct member id)
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph()(2),
      },
    },
  );
  typia.assert(comment);

  // 3. Attempt to fetch a nonexistent attachment as admin
  const randomAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Attachment not found should return 404")(
    async () => {
      await api.functional.discussionBoard.admin.comments.attachments.at(
        connection,
        {
          commentId: comment.id,
          attachmentId: randomAttachmentId,
        },
      );
    },
  );
}
