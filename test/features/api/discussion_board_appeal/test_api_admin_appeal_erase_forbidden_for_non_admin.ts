import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * Test that verifies a non-admin user cannot delete an appeal via the admin
 * endpoint.
 *
 * 1. Register and authenticate a standard user. Assert successful login and
 *    token issuance.
 * 2. As this user, create an appeal. Confirm entity creation and id retrieval.
 * 3. While still authenticated as a non-admin, attempt to delete the appeal
 *    via the admin endpoint.
 * 4. Validate that the delete operation fails with a forbidden error,
 *    confirming enforcement of admin-only access control.
 *
 * This test confirms that role-based permissions are enforced so non-admins
 * cannot access admin-only operations.
 */
export async function test_api_admin_appeal_erase_forbidden_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a normal user
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "Aa1!";
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // 2. Create a new appeal as this user
  const appeal = await api.functional.discussionBoard.user.appeals.create(
    connection,
    {
      body: {
        appellant_id: userAuth.user.id,
        appeal_reason: RandomGenerator.paragraph({ sentences: 6 }),
        moderation_action_id: null,
        flag_report_id: null,
      } satisfies IDiscussionBoardAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // 3. Attempt to delete the appeal with the admin endpoint (should fail)
  await TestValidator.error(
    "non-admin cannot delete appeal via admin endpoint",
    async () => {
      await api.functional.discussionBoard.admin.appeals.erase(connection, {
        appealId: appeal.id,
      });
    },
  );
}
