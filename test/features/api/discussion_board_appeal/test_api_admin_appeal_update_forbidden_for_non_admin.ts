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
 * Ensure that a non-admin (regular user) cannot update an appeal using the
 * admin endpoint.
 *
 * This test validates the authorization boundary by confirming that the
 * update endpoint for admin appeals
 * (/discussionBoard/admin/appeals/:appealId) is not accessible to regular,
 * non-admin users. The scenario involves:
 *
 * 1. Registering a user account and logging in to receive valid credentials.
 * 2. Using that user identity to create an appeal.
 * 3. Attempting to update this appeal using the admin-only endpoint as the
 *    regular user.
 * 4. Asserting that access is forbidden and the update attempt is rejected.
 *
 * Steps:
 *
 * 1. Register user with unique email & username, explicit consent, and strong
 *    password.
 * 2. Login as user to confirm authentication context.
 * 3. Create a new appeal; retain its id for update attempt.
 * 4. Attempt admin update of appeal as regular user; confirm forbidden error.
 * 5. (Do not authenticate as admin during this test.)
 *
 * Only role privilege boundary enforcement is validated; does not cover
 * valid update cases or admin role success paths.
 */
export async function test_api_admin_appeal_update_forbidden_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Register user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = "Secr3t!Passw0rd";

  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: username,
      password: password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // 2. (Optional, but explicitly re-login to enforce auth token)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: password,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 3. Create a new appeal as this user
  const appeal = await api.functional.discussionBoard.user.appeals.create(
    connection,
    {
      body: {
        appellant_id: userAuth.user.id,
        appeal_reason: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardAppeal.ICreate,
    },
  );
  typia.assert(appeal);

  // 4. As non-admin (user), attempt to update the appeal via the admin endpoint
  await TestValidator.error(
    "non-admin user cannot update appeal via admin endpoint",
    async () => {
      await api.functional.discussionBoard.admin.appeals.update(connection, {
        appealId: appeal.id,
        body: {
          resolution_comment: RandomGenerator.paragraph({ sentences: 2 }),
          status: "resolved",
        } satisfies IDiscussionBoardAppeal.IUpdate,
      });
    },
  );
}
