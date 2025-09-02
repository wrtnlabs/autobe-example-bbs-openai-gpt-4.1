import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate that an admin can fetch a user's moderator status and assignment
 * details using the PATCH /discussionBoard/admin/users/{userId}/moderator
 * endpoint.
 *
 * This test ensures:
 *
 * 1. Admins can retrieve a user's moderator assignment record, including
 *    status and timestamps.
 * 2. Only admin context (or moderator, if supported) can access this endpoint;
 *    regular users are denied.
 * 3. All expected fields (assigned_at, is_active, revoked_at, etc.) are
 *    present and correctly typed in the response.
 * 4. Non-admin or unauthenticated users are denied access with proper error.
 *
 * Steps:
 *
 * 1. Register an admin user (with unique email, username, secure password,
 *    consent).
 * 2. Register a standard user (unique credentials, consent).
 * 3. Login as admin if user context switch was performed.
 * 4. Assign moderator to the user via admin privilege.
 * 5. As admin, request the user's moderator status via PATCH endpoint.
 * 6. Validate moderator assignment record returned and fields correctness.
 * 7. Attempt same access using regular user authentication (should fail
 *    privilege check).
 * 8. Attempt same access as unauthenticated (should fail with no token
 *    provided).
 */
export async function test_api_admin_get_user_moderator_status(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "A!1";
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUser);

  // 2. Promote adminUser to admin
  const adminRecord = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUser.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminRecord);

  // 3. Register regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name();
  const userPassword = RandomGenerator.alphaNumeric(12) + "B!2";
  const regularUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(regularUser);

  // 4. Ensure admin authentication context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 5. Assign moderator role to user
  const moderatorAssignment =
    await api.functional.discussionBoard.admin.users.moderator.assignModerator(
      connection,
      {
        userId: regularUser.user.id,
        body: {
          user_id: regularUser.user.id,
        } satisfies IDiscussionBoardModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  TestValidator.equals(
    "moderator assignment points to the correct user",
    moderatorAssignment.user_id,
    regularUser.user.id,
  );
  TestValidator.predicate(
    "moderator assignment is active",
    moderatorAssignment.is_active === true,
  );

  // 6. As admin, fetch moderator status
  const modStatus =
    await api.functional.discussionBoard.admin.users.moderator.moderatorStatus(
      connection,
      {
        userId: regularUser.user.id,
        body: {} satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(modStatus);
  TestValidator.equals(
    "moderator status user_id matches",
    modStatus.user_id,
    regularUser.user.id,
  );
  TestValidator.predicate(
    "moderator status is active",
    modStatus.is_active === true,
  );
  TestValidator.predicate(
    "moderator status contains assigned_at timestamp",
    typeof modStatus.assigned_at === "string" &&
      modStatus.assigned_at.length > 0,
  );

  // 7. Switch to user context and try to fetch moderator status (should be denied)
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail + ".alt",
      username: userUsername + "2",
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  await TestValidator.error(
    "regular user cannot access moderator status endpoint",
    async () => {
      await api.functional.discussionBoard.admin.users.moderator.moderatorStatus(
        connection,
        {
          userId: regularUser.user.id,
          body: {} satisfies IDiscussionBoardModerator.IRequest,
        },
      );
    },
  );

  // 8. Remove auth context and try as unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.discussionBoard.admin.users.moderator.moderatorStatus(
      unauthConn,
      {
        userId: regularUser.user.id,
        body: {} satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  });
}
