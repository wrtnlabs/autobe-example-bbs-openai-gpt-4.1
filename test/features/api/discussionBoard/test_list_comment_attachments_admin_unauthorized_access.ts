import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Test unauthorized (non-admin) access to comment attachments on admin
 * endpoint.
 *
 * This test verifies that a member who is not an admin cannot access the list
 * of attachments for a comment owned by another member using the admin
 * endpoint, thereby ensuring access control is enforced and membership-based
 * security is in place. This guards sensitive comment attachments against
 * unauthorized viewing or download by unrelated users.
 *
 * Test steps:
 *
 * 1. Two board members are created via the admin member creation API (simulate two
 *    user personas).
 * 2. The first user creates a comment using the member comments API (they are the
 *    author/owner).
 * 3. As the second user, attempt to access the list of attachments for the first
 *    user's comment via the admin endpoint.
 *
 *    - This should trigger an authorization/permission error (access denied), as
 *         only admin or comment owner should have access.
 *    - The test passes if the API throws an error; fails if the attachments are
 *         returned successfully.
 * 4. Validate that the error occurs as expected and no data leak happens.
 */
export async function test_api_discussionBoard_test_list_comment_attachments_admin_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Create two member records (as admin)
  const member1 = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member1);

  const member2 = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member2);

  // 2. As member1, create a comment
  // (Assume connection is impersonated with member1 for comment) -- session/token logic out-of-scope
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member1.id,
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. As member2 (non-admin, not owner), try accessing attachments for member1's comment via admin endpoint
  // (Assume connection is now impersonated as member2)
  await TestValidator.error(
    "Non-admin, non-owner cannot access comment attachments via admin endpoint",
  )(async () => {
    await api.functional.discussionBoard.admin.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
      },
    );
  });
}
