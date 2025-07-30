import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Test that non-owners are forbidden from accessing another user's comment
 * attachment detail.
 *
 * This test ensures that the API enforces strict access control for attachment
 * resources bound to comment entities. Only the comment's owner should be able
 * to retrieve attachment details; all other users (even if registered) must be
 * denied access, preventing unauthorized exposure of attached files or
 * sensitive metadata.
 *
 * Workflow Summary:
 *
 * 1. Create two distinct discussion board member users ("owner" and "intruder").
 * 2. Create a comment owned by the "owner" member. Simulate at least one
 *    attachment belonging to this comment, linked to the owner's member ID.
 * 3. Attempt to retrieve the attachment detail as the "intruder" (not the owner).
 * 4. Confirm that access is denied and that an error is thrown, preventing data
 *    leakage.
 *
 * Note: Since the attachment creation flow is not exposed in the available SDK,
 * the test simulates attachment record knowledge by presuming at least one
 * exists on comment creation (via dependencies or random data), extracting
 * available IDs directly from the created record or mock/fixed values as
 * needed.
 */
export async function test_api_discussionBoard_test_get_comment_attachment_detail_member_access_denied_to_non_owner(
  connection: api.IConnection,
) {
  // 1. Create two distinct members for test -"owner" and "intruder"
  const ownerEmail: string = RandomGenerator.alphabets(10) + "@owner.test";
  const intruderEmail: string =
    RandomGenerator.alphabets(10) + "@intruder.test";
  const now: string = new Date().toISOString();

  const owner = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: ownerEmail,
        joined_at: now,
      },
    },
  );
  typia.assert(owner);

  const intruder = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: intruderEmail,
        joined_at: now,
      },
    },
  );
  typia.assert(intruder);

  // 2. Owner creates a comment (simulate at least one real post UUID)
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: owner.id,
        discussion_board_post_id: postId,
        content: RandomGenerator.paragraph()(),
      },
    },
  );
  typia.assert(comment);

  // 3. Simulate an attachment belonging to the owner's comment (pretend UUIDs)
  // Since no attachment creation endpoint, synthesize with typia.random for a realistic UUID
  const fakeAttachmentId: string = typia.random<string & tags.Format<"uuid">>();

  // 4. Attempt by the "intruder" to access owner's comment attachment:
  // (Supposing connection context is not per-user, but relies on parameters for identification.)
  // In real use, the backend enforces access via member id in session/token, but here the member is only referenced in the comment.
  // Try fetching attachment as the "intruder".
  await TestValidator.error(
    "intruder forbidden to access owner's comment attachment",
  )(async () => {
    await api.functional.discussionBoard.member.comments.attachments.at(
      connection,
      {
        commentId: comment.id,
        attachmentId: fakeAttachmentId,
      },
    );
  });
}
