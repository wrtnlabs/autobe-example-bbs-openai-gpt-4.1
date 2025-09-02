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
 * Validate that an admin can revoke moderator privileges from a user.
 *
 * Test covers the entire privilege change workflow:
 *
 * 1. Admin registration (join a verified user as admin)
 * 2. User registration (standard member creation)
 * 3. Admin authentication (login for necessary token context)
 * 4. Moderator assignment via admin endpoint
 * 5. Moderator revocation via admin endpoint (test main scenario)
 * 6. Type and business state checks: ensure the user's moderator privilege is
 *    correctly revoked, audit fields are persisted, and appropriate status
 *    is set (revoked_at, deleted_at, is_active == false)
 * 7. Error scenario: verify that an admin cannot revoke a moderator role that
 *    has already been revoked (business rule enforcement)
 */
export async function test_api_admin_revoke_moderator_role_success(
  connection: api.IConnection,
) {
  // Step 1: Admin registration (Create a user and elevate to admin)
  const adminUserEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: adminUserEmail,
      username: adminUsername,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUser);

  // Elevate this user to admin
  const adminTokenBundle = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUser.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminTokenBundle);

  // Step 2: Register a standard member (target for moderator role)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name();
  const memberPassword = RandomGenerator.alphaNumeric(12) as string &
    tags.Format<"password">;
  const userMember = await api.functional.auth.user.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userMember);

  // Step 3: Admin authentication (switch context to admin)
  const adminAuthResponse = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminUserEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminAuthResponse);

  // Step 4: Assign moderator privilege to the user
  const modAssign =
    await api.functional.discussionBoard.admin.users.moderator.assignModerator(
      connection,
      {
        userId: userMember.user.id,
        body: {
          user_id: userMember.user.id,
        } satisfies IDiscussionBoardModerator.ICreate,
      },
    );
  typia.assert(modAssign);
  TestValidator.predicate(
    "Moderator assignment is active",
    modAssign.is_active === true &&
      modAssign.revoked_at === null &&
      modAssign.deleted_at === null,
  );

  // Step 5: Revoke moderator privilege via the DELETE endpoint
  const modRevoked =
    await api.functional.discussionBoard.admin.users.moderator.revokeModerator(
      connection,
      {
        userId: userMember.user.id,
      },
    );
  typia.assert(modRevoked);
  TestValidator.predicate(
    "Moderator is revoked and marked as inactive",
    !modRevoked.is_active && !!modRevoked.revoked_at && !!modRevoked.deleted_at,
  );

  // Step 6: Attempt to revoke again (should error, business enforcement)
  await TestValidator.error(
    "Cannot revoke moderator role again after revocation",
    async () => {
      await api.functional.discussionBoard.admin.users.moderator.revokeModerator(
        connection,
        {
          userId: userMember.user.id,
        },
      );
    },
  );
}
