import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * E2E test for admin user update (success and constraints)
 *
 * This test ensures that an admin can update mutable fields (display_name,
 * username) of a user, and covers these paths:
 *
 * - Success: valid update to display_name and username
 * - Constraint violation: duplicate username update attempt
 * - Format validation: invalid username or display_name data
 * - Not found: update attempt on a non-existent or deleted user
 *
 * Steps:
 *
 * 1. Register first user (used for admin promotion and admin auth context)
 * 2. Register second user (target for main update, and for duplicate username
 *    test)
 * 3. Register third user (to provide target for random, non-colliding
 *    duplicate tests)
 * 4. Promote the first user to admin
 * 5. (Re)join as admin (establish admin token)
 * 6. Admin successfully updates second user's display_name/username
 * 7. Attempt duplicate username update (should fail)
 * 8. Attempt invalid username format (should fail)
 * 9. Attempt update on random, non-existent user (should fail)
 */
export async function test_api_admin_user_update_success_and_constraints(
  connection: api.IConnection,
) {
  // 1. Register three unique users: admin, user, and a control user for unique username/email
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUsername: string = RandomGenerator.alphaNumeric(10);
  const targetEmail: string = typia.random<string & tags.Format<"email">>();
  const targetUsername: string = RandomGenerator.alphaNumeric(10);
  const controlEmail: string = typia.random<string & tags.Format<"email">>();
  const controlUsername: string = RandomGenerator.alphaNumeric(10);
  const password: string = "Abc@123456!";

  // Register admin user
  const adminJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminJoin);
  const adminUser = adminJoin.user;

  // Register the user to be updated
  const targetJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: targetEmail,
      username: targetUsername,
      password,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(targetJoin);
  const targetUser = targetJoin.user;

  // Register an additional control user (for duplicate username test)
  const controlJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: controlEmail,
      username: controlUsername,
      password,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(controlJoin);
  const controlUser = controlJoin.user;

  // Promote the admin user to admin via admin.join (using adminUser.id)
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUser.id } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);
  // After admin.join, connection.headers.Authorization is set to the admin's token

  // 6. Success: Admin updates target user's display_name and username
  const newDisplayName = RandomGenerator.name();
  const newUsername = RandomGenerator.alphaNumeric(12);

  const updateSuccess = await api.functional.discussionBoard.admin.users.update(
    connection,
    {
      userId: targetUser.id,
      body: {
        display_name: newDisplayName,
        username: newUsername,
      } satisfies IDiscussionBoardUser.IUpdate,
    },
  );
  typia.assert(updateSuccess);
  TestValidator.equals(
    "display_name updated by admin",
    updateSuccess.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "username updated by admin",
    updateSuccess.username,
    newUsername,
  );

  // 7. Constraint: Attempt to set username to one that already exists (controlUser.username)
  await TestValidator.error(
    "admin cannot update to duplicate username",
    async () => {
      await api.functional.discussionBoard.admin.users.update(connection, {
        userId: targetUser.id,
        body: {
          username: controlUser.username,
        } satisfies IDiscussionBoardUser.IUpdate,
      });
    },
  );

  // 8. Format: Attempt invalid username (e.g., special chars or too short)
  const invalidUsernames = [
    "!@#$%",
    "ab",
    "",
    RandomGenerator.paragraph({ sentences: 30 }),
  ];
  for (const badUsername of invalidUsernames) {
    await TestValidator.error(
      `admin cannot update user to invalid username (${badUsername})`,
      async () => {
        await api.functional.discussionBoard.admin.users.update(connection, {
          userId: targetUser.id,
          body: {
            username: badUsername,
          } satisfies IDiscussionBoardUser.IUpdate,
        });
      },
    );
  }

  // Also test an excessive display_name length
  const longDisplayName = RandomGenerator.paragraph({ sentences: 100 });
  await TestValidator.error(
    "admin cannot set display_name to excessive length",
    async () => {
      await api.functional.discussionBoard.admin.users.update(connection, {
        userId: targetUser.id,
        body: {
          display_name: longDisplayName,
        } satisfies IDiscussionBoardUser.IUpdate,
      });
    },
  );

  // 9. Not found: Attempt update on a random non-existent userId
  const fakeUserId: string = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin cannot update non-existent user",
    async () => {
      await api.functional.discussionBoard.admin.users.update(connection, {
        userId: fakeUserId,
        body: {
          display_name: RandomGenerator.name(),
        } satisfies IDiscussionBoardUser.IUpdate,
      });
    },
  );
}
