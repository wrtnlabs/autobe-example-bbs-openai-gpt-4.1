import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate that admin registration fails for unverified users.
 *
 * Business context: Admin registration in the discussion board system
 * requires that the target user is already verified (is_verified: true). In
 * this scenario, we will create a standard user (who is unverified by
 * default), then immediately attempt to register that user as an admin. The
 * system should enforce its business rule by rejecting the operation.
 *
 * Test Workflow:
 *
 * 1. Register a new user via /auth/user/join. The resulting user will have
 *    is_verified=false (not verified yet).
 * 2. Attempt to register the new unverified user as an admin via
 *    /auth/admin/join using the user's id.
 * 3. Validate that the API responds with an error, confirming that admin
 *    assignment to unverified users is not permitted.
 * 4. (Optional) Validate that no admin account was created for the unverified
 *    user (if list API exists - omitted if unavailable).
 */
export async function test_api_admin_registration_failure_unverified_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user (will be unverified by default)
  const newUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(12) + "1A!",
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(newUser);
  TestValidator.predicate(
    "new discussion board user is NOT verified",
    newUser.user.is_verified === false,
  );

  // Step 2+3: Attempt to register the user as admin and expect an error
  await TestValidator.error(
    "cannot assign admin role to unverified user",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          user_id: newUser.user.id,
        } satisfies IDiscussionBoardAdmin.ICreate,
      });
    },
  );
}
