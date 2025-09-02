import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test error on duplicate admin privilege assignment for an already-active
 * admin.
 *
 * This test ensures:
 *
 * - Admin role can only be assigned once per user.
 * - Redundant privilege assignment attempts trigger a business-rule violation
 *   (not silently idempotent).
 * - System prevents any role-escalation bugs or privilege-status corruption
 *   when duplicate assignment is attempted.
 *
 * Workflow:
 *
 * 1. Register and authenticate an admin account (using distinct user
 *    credentials).
 * 2. Register a new standard user. This will be the promotion target.
 * 3. Assign admin privileges to the user for the first time (should succeed,
 *    activating admin role).
 * 4. Attempt to assign admin privileges to the same user again (duplicate
 *    case). This must fail.
 * 5. Validate the returned error from the redundant assignment. Confirm that
 *    status of already-assigned admin is unaffected (by type assertion on
 *    prior outputs).
 */
export async function test_api_admin_assign_admin_privilege_error_on_duplicate(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin actor
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "Adm1nP@ssw0rd#",
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUser);

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUser.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Register a standard user (target for privilege escalation)
  const targetUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "Us3rP@ssw0rd!",
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(targetUser);

  // 3. Grant admin privileges -- initial assignment should succeed
  const adminAssignment =
    await api.functional.discussionBoard.admin.users.admin.assignAdmin(
      connection,
      {
        userId: targetUser.user.id,
        body: {
          user_id: targetUser.user.id,
        } satisfies IDiscussionBoardAdmin.ICreate,
      },
    );
  typia.assert(adminAssignment);
  TestValidator.equals(
    "Initial admin assignment user_id matches assigned user",
    adminAssignment.user_id,
    targetUser.user.id,
  );
  TestValidator.predicate(
    "Admin role should be active after initial assignment",
    adminAssignment.is_active === true && !adminAssignment.revoked_at,
  );

  // 4. Duplicate admin assignment must trigger error (test for idempotency/safety)
  await TestValidator.error(
    "Duplicate assignment should fail with business rule error",
    async () => {
      await api.functional.discussionBoard.admin.users.admin.assignAdmin(
        connection,
        {
          userId: targetUser.user.id,
          body: {
            user_id: targetUser.user.id,
          } satisfies IDiscussionBoardAdmin.ICreate,
        },
      );
    },
  );
}
