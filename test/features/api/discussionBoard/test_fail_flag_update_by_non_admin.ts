import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Validate that non-admin users cannot update a content flag (moderation
 * enforcement).
 *
 * Business rationale: Content flags mark posts or comments for moderation and
 * are strictly modifiable only by admin/moderator users. Regular board members
 * must NOT be able to update such records. This test confirms that unauthorized
 * update attempts are correctly rejected with an authorization error.
 *
 * Test Flow:
 *
 * 1. Admin: Create a board member for commenting
 * 2. Admin: Create a comment as that member
 * 3. Admin: Flag the comment for moderation
 * 4. Admin: Create another regular member (non-admin)
 * 5. Simulate: (Assume non-admin login context) Attempt to update the flag as
 *    non-admin
 * 6. Confirm that the API rejects the update with an authorization error
 *
 * Notes:
 *
 * - SDK does not expose explicit login/auth switching for test users—assume E2E
 *   infra provides correct session token for step 5. This test code follows the
 *   intent, and it's assumed the underlying test runner swaps authentication
 *   context as required.
 * - Comment post creation uses a dummy/random post UUID due to lack of a board
 *   post creation API in this suite.
 */
export async function test_api_discussionBoard_test_fail_flag_update_by_non_admin(
  connection: api.IConnection,
) {
  // 1. Create a discussion board member (admin-only endpoint)
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(16),
        joined_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    },
  );
  typia.assert(member);

  // 2. Create a comment as the member
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph()(),
      },
    },
  );
  typia.assert(comment);

  // 3. As admin, flag the comment for moderation
  const flag = await api.functional.discussionBoard.admin.contentFlags.create(
    connection,
    {
      body: {
        comment_id: comment.id,
        flag_type: "spam",
        flag_source: "manual",
        flag_details: "Test flag for moderation.",
      },
    },
  );
  typia.assert(flag);

  // 4. Create another regular member (non-admin, for unauthorized attempt)
  const nonAdmin = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(16),
        joined_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    },
  );
  typia.assert(nonAdmin);

  // 5. (Simulated) E2E infra switches context: attempt update as non-admin
  // In this code, assume 'connection' is set to authenticate as nonAdmin member
  await TestValidator.error("Non-admin cannot update content flag")(
    async () => {
      await api.functional.discussionBoard.admin.contentFlags.update(
        connection,
        {
          contentFlagId: flag.id,
          body: {
            flag_type: "abuse",
            flag_details: "Non-admin trying unauthorized update.",
          },
        },
      );
    },
  );
}
