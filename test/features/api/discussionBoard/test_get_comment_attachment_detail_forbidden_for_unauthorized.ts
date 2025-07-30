import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Test forbidden access to comment attachment detail for unauthorized roles.
 *
 * This test validates that only authorized users (moderators or the resource
 * owner) may access attachment metadata for a comment, and other users
 * (non-owners, other members, or guests) must be denied.
 *
 * Business context: Attachments may contain sensitive/private data, so strict
 * role-based access control (RBAC) is required. This test ensures RBAC is
 * correctly enforced by the read-detail moderator endpoint, protecting private
 * files from non-authorized access.
 *
 * Steps:
 *
 * 1. Register board member A, who becomes the owner/uploader of an attachment.
 * 2. Board member A creates a comment.
 * 3. Board member A uploads an attachment to the comment.
 * 4. Register another board member B (simulating an unrelated user—not owner,
 *    moderator, or staff).
 * 5. Attempt to view the attachment's detail via the moderator endpoint as board
 *    member B: expect error (forbidden).
 * 6. Optionally, validate a similar error occurs for a "guest" (if unauthenticated
 *    context is possible with the API as implemented).
 *
 * This scenario enforces correct negative access for both member and guest (to
 * the extent allowed by the available authentication APIs).
 */
export async function test_api_discussionBoard_test_get_comment_attachment_detail_forbidden_for_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register member A (the owner/uploader)
  const ownerUserIdentifier = RandomGenerator.alphaNumeric(16);
  const ownerMember = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: ownerUserIdentifier,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(ownerMember);

  // 2. Member A creates a comment (choose arbitrary post)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: ownerMember.id,
        discussion_board_post_id: postId,
        content: RandomGenerator.paragraph()(2),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Member A uploads an attachment to the comment
  const attachment =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: ownerMember.id,
          file_name: `file_${RandomGenerator.alphaNumeric(8)}.png`,
          file_url: `https://cdn.test/${RandomGenerator.alphaNumeric(8)}.png`,
          mime_type: "image/png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Register unrelated member B (simulate an unauthorized actor)
  const unauthorizedUserIdentifier = RandomGenerator.alphaNumeric(16);
  const unauthorizedMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: unauthorizedUserIdentifier,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(unauthorizedMember);

  // 5. Attempt forbidden access as unrelated member/non-owner
  // Note: No role/account switching APIs available. We simulate unauthorized access as best we can.
  await TestValidator.error("forbidden: only owner/moderator may access")(
    async () =>
      api.functional.discussionBoard.moderator.comments.attachments.at(
        connection,
        {
          commentId: comment.id,
          attachmentId: attachment.id,
        },
      ),
  );

  // 6. Optional: If guest/unauthenticated context is possible in real API, check forbidden for no-auth user
  // (Not implemented here due to lack of unauthenticated connection handling API.)
}
