import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate the successful reinstatement of admin privileges by an admin.
 *
 * This test sets up two users: one to act as the privileged admin, and
 * another to simulate the user whose admin privileges will be assigned,
 * revoked, and reinstated. It performs the full business flow required for
 * admin privilege changes.
 *
 * Steps:
 *
 * 1. Register a standard user (User A), upgrade them to admin (as the
 *    privileged actor).
 * 2. Register a second user (User B) to act as the target for admin privilege
 *    assignment, revoke, and reinstate operations.
 * 3. Assign admin privileges to User B.
 * 4. Revoke admin privileges from User B.
 * 5. Reinstate admin privileges for User B via PATCH.
 * 6. Validate states after each operation: is_active and revoked_at
 *    transitions as expected.
 *
 * All steps validate both API responses and business workflow correctness.
 */
export async function test_api_admin_reinstate_admin_privileges_success(
  connection: api.IConnection,
) {
  // 1. Register User A and upgrade to admin
  const userA_input: IDiscussionBoardUser.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12) + "1Aa@",
    consent: true,
  };
  const userA_auth = await api.functional.auth.user.join(connection, {
    body: userA_input,
  });
  typia.assert(userA_auth);
  const userA_id = userA_auth.user.id;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: userA_id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);
  // At this point, connection is authenticated as admin (User A)

  // 2. Register User B (target for admin privilege operations)
  const userB_input: IDiscussionBoardUser.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12) + "1Bb@",
    consent: true,
  };
  const userB_auth = await api.functional.auth.user.join(connection, {
    body: userB_input,
  });
  typia.assert(userB_auth);
  const userB_id = userB_auth.user.id;

  // 3. Assign admin privileges to User B
  const assignedAdmin =
    await api.functional.discussionBoard.admin.users.admin.assignAdmin(
      connection,
      {
        userId: userB_id,
        body: {
          user_id: userB_id,
        } satisfies IDiscussionBoardAdmin.ICreate,
      },
    );
  typia.assert(assignedAdmin);
  TestValidator.predicate(
    "Assigned admin is_active true and revoked_at is null after assignment",
    assignedAdmin.is_active === true && assignedAdmin.revoked_at === null,
  );

  // 4. Revoke admin privileges from User B
  const revokedAdmin =
    await api.functional.discussionBoard.admin.users.admin.revokeAdmin(
      connection,
      {
        userId: userB_id,
      },
    );
  typia.assert(revokedAdmin);
  TestValidator.predicate(
    "Admin is_active false and revoked_at set after revocation",
    revokedAdmin.is_active === false && revokedAdmin.revoked_at !== null,
  );

  // 5. Reinstate admin privileges for User B
  const reinstatedAdmin =
    await api.functional.discussionBoard.admin.users.admin.reinstateAdmin(
      connection,
      {
        userId: userB_id,
        body: {
          is_active: true,
          revoked_at: null,
        } satisfies IDiscussionBoardAdmin.IUpdate,
      },
    );
  typia.assert(reinstatedAdmin);
  TestValidator.predicate(
    "Admin is_active true and revoked_at is null after reinstatement",
    reinstatedAdmin.is_active === true && reinstatedAdmin.revoked_at === null,
  );
}
