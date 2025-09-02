import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test revocation of admin privileges from a non-admin user.
 *
 * This test ensures that:
 *
 * - If an admin attempts to revoke privileges from a user who is not
 *   currently an admin, the system responds with a clear error and no
 *   privilege record is altered.
 *
 * Steps:
 *
 * 1. Register as an admin (to obtain authorization for admin operations).
 * 2. Register a regular user (no admin privileges assigned).
 * 3. Attempt to revoke admin privileges from the non-admin user using the
 *    admin credentials.
 * 4. Assert that an error occurs (using TestValidator.error), and that the
 *    error message indicates the target user is not an active admin.
 */
export async function test_api_admin_revoke_admin_privilege_error_on_non_admin(
  connection: api.IConnection,
) {
  // 1. Register as an admin user (create user)
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12) + "A!1",
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUser);

  // Elevate this user to admin
  const adminCredentials = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUser.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminCredentials);

  // 2. Register another user who will remain a regular member (non-admin)
  const regularUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12) + "B@2",
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(regularUser);

  // 3. Attempt to revoke admin privileges for the non-admin (should fail)
  await TestValidator.error(
    "revoke admin fails for user who was never an admin",
    async () => {
      await api.functional.discussionBoard.admin.users.admin.revokeAdmin(
        connection,
        {
          userId: regularUser.user.id,
        },
      );
    },
  );
}
