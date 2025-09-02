import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test that admin privilege assignment fails for ineligible users.
 *
 * This test covers the following business logic:
 *
 * - Only active, verified, non-suspended, and non-soft-deleted (not
 *   deleted_at) users can be made admin.
 * - The system must prevent admin assignment to users who do not meet
 *   eligibility criteria, including those who have been soft-deleted.
 *
 * 1. Register a new admin account (as acting admin)
 * 2. Log in as the admin
 * 3. Register a new normal user account to use as the ineligible user
 * 4. Soft-delete (deactivate) the user (simulate ineligible state)
 * 5. Ensure acting admin is authenticated (role context switch if needed)
 * 6. Attempt to PUT assign admin privileges to the soft-deleted user
 * 7. Assert that an error occurs (using TestValidator.error)
 */
export async function test_api_admin_assign_admin_privilege_error_on_invalid_user(
  connection: api.IConnection,
) {
  // 1. Register a new admin account (so we have an acting admin)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Test1234!@#"; // meets password policy
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(), // placeholder for compliance, will not be checked on error path
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Log in as the admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 3. Register a new normal user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "Userpass123!#"; // strong password
  const newUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: RandomGenerator.alphaNumeric(12),
      password: userPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(newUser);

  // 4. Soft-delete user
  await api.functional.discussionBoard.user.users.erase(connection, {
    userId: newUser.user.id,
  });

  // 5. Ensure acting admin is authenticated (could be already, role context switch)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 6. Attempt to assign admin privilege to soft-deleted user
  await TestValidator.error(
    "Fail to assign admin privileges to soft-deleted user",
    async () => {
      await api.functional.discussionBoard.admin.users.admin.assignAdmin(
        connection,
        {
          userId: newUser.user.id,
          body: {
            user_id: newUser.user.id,
          } satisfies IDiscussionBoardAdmin.ICreate,
        },
      );
    },
  );
}
