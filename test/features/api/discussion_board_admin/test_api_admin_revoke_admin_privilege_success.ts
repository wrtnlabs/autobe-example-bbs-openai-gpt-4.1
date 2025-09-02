import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test successful revocation of admin privileges by an authenticated admin
 * against another active admin.
 *
 * This test verifies that when an admin revokes the privileges of another
 * active admin:
 *
 * - The admin privilege record (discussion_board_admins) is correctly
 *   soft-deleted.
 * - 'deleted_at' and 'revoked_at' fields are set and 'is_active' becomes
 *   false.
 * - The previously promoted admin cannot re-acquire admin via the API
 *   (privilege is effectively removed).
 *
 * Steps:
 *
 * 1. Register the main admin user and authenticate as admin.
 * 2. Register a second user (the user to be promoted and then revoked).
 * 3. As the main admin, grant admin privileges to the second user.
 * 4. As the main admin, revoke admin privileges from the second user.
 * 5. Validate the record fields reflect the revocation.
 * 6. Attempt to re-promote the revoked user to admin (expecting failure).
 */
export async function test_api_admin_revoke_admin_privilege_success(
  connection: api.IConnection,
) {
  // 1. Register the main admin (creates user and then promotes to admin)
  const mainUserEmail = typia.random<string & tags.Format<"email">>();
  const mainUsername = RandomGenerator.name();
  const mainUserPassword = "A1b2c3d4!xYz"; // policy: 10+ chars, uppercase, lowercase, number, special
  const mainUser = await api.functional.auth.user.join(connection, {
    body: {
      email: mainUserEmail,
      username: mainUsername,
      password: mainUserPassword,
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(mainUser);

  const mainAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: mainUser.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(mainAdmin);

  // 2. Register a regular user (future promoted admin)
  const targetUserEmail = typia.random<string & tags.Format<"email">>();
  const targetUsername = RandomGenerator.name();
  const targetUserPassword = "B2c3d4e5!Wx"; // strong password compliance
  const targetUser = await api.functional.auth.user.join(connection, {
    body: {
      email: targetUserEmail,
      username: targetUsername,
      password: targetUserPassword,
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(targetUser);

  // 3. As admin, assign admin privileges to this user
  const promotedAdmin =
    await api.functional.discussionBoard.admin.users.admin.assignAdmin(
      connection,
      {
        userId: targetUser.user.id,
        body: {
          user_id: targetUser.user.id,
        } satisfies IDiscussionBoardAdmin.ICreate,
      },
    );
  typia.assert(promotedAdmin);
  TestValidator.predicate("promotedAdmin is active", promotedAdmin.is_active);
  TestValidator.equals(
    "promoted admin has no revoked_at before revocation",
    promotedAdmin.revoked_at,
    null,
  );
  TestValidator.equals(
    "promoted admin has no deleted_at before revocation",
    promotedAdmin.deleted_at,
    null,
  );

  // 4. As admin, revoke admin privileges from target user
  const revokedAdmin =
    await api.functional.discussionBoard.admin.users.admin.revokeAdmin(
      connection,
      {
        userId: targetUser.user.id,
      },
    );
  typia.assert(revokedAdmin);
  TestValidator.equals(
    "user_id matches target user",
    revokedAdmin.user_id,
    targetUser.user.id,
  );
  TestValidator.predicate(
    "revoked admin is not active",
    !revokedAdmin.is_active,
  );
  TestValidator.predicate(
    "revoked admin deleted_at is present",
    revokedAdmin.deleted_at !== null && revokedAdmin.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "revoked admin revoked_at is present",
    revokedAdmin.revoked_at !== null && revokedAdmin.revoked_at !== undefined,
  );

  // 5. Attempt to use revoked admin's credentials to re-register as admin (should fail)
  await api.functional.auth.user.join(connection, {
    body: {
      email: targetUserEmail,
      username: targetUsername,
      password: targetUserPassword,
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  await TestValidator.error(
    "revoked user cannot regain admin rights (join as admin fails)",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          user_id: targetUser.user.id,
        } satisfies IDiscussionBoardAdmin.ICreate,
      });
    },
  );
}
