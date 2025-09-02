import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * E2E test for admin-only access to detailed user profiles via
 * /discussionBoard/admin/users/{userId}.
 *
 * - Ensures only an authenticated admin can retrieve full user info.
 * - Confirms all fields match for happy path.
 * - Tests error response for non-existent userId.
 * - Tests error/forbidden response for access by a non-admin.
 *
 * Steps:
 *
 * 1. Register ordinary user (collect credentials, userId)
 * 2. Register admin for that user (require userId)
 * 3. Retrieve user as admin (all fields correct)
 * 4. Try random userId (not found error)
 * 5. Register another user, switch context, try as normal user (should fail)
 */
export async function test_api_admin_user_info_access_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register ordinary user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1) + RandomGenerator.alphabets(3);
  const userRegister = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password: RandomGenerator.alphaNumeric(12) + "!AbC@1",
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userRegister);
  const userId = userRegister.user.id;

  // 2. Register (elevate) this user as admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: { user_id: userId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 3. Retrieve user as admin (happy path)
  const result = await api.functional.discussionBoard.admin.users.at(
    connection,
    { userId },
  );
  typia.assert(result);
  TestValidator.equals("userId matches", result.id, userId);
  TestValidator.equals("user email matches", result.email, userEmail);
  TestValidator.equals("username matches", result.username, username);
  TestValidator.equals(
    "user account should not be deleted",
    result.deleted_at,
    null,
  );
  TestValidator.predicate(
    "user account should not be suspended",
    !result.is_suspended,
  );

  // 4. Try random (non-existent) userId
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("admin: random userId should fail", async () => {
    await api.functional.discussionBoard.admin.users.at(connection, {
      userId: randomId,
    });
  });

  // 5. Register a new standard user and switch context
  const anotherEmail = typia.random<string & tags.Format<"email">>();
  const anotherUsername =
    RandomGenerator.name(1) + RandomGenerator.alphabets(4);
  const user2Register = await api.functional.auth.user.join(connection, {
    body: {
      email: anotherEmail,
      username: anotherUsername,
      password: RandomGenerator.alphaNumeric(12) + "Zx@!1cD",
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user2Register);

  // Now context is normal user credentials (not admin)
  await TestValidator.error(
    "non-admin forbidden on admin user info API",
    async () => {
      await api.functional.discussionBoard.admin.users.at(connection, {
        userId,
      });
    },
  );
}
