import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate error response when reinstating admin privileges for already
 * active admin user.
 *
 * This E2E test ensures the system prevents redundant or duplicate
 * activation of admin status, enforcing privilege consistency.
 *
 * Steps:
 *
 * 1. Register as super-admin (admin context for role management)
 * 2. Register a regular user
 * 3. Assign admin privileges to this regular user (user is now active admin)
 * 4. Attempt to PATCH /discussionBoard/admin/users/{userId}/admin to reinstate
 *    admin while already active
 * 5. Confirm API returns an error indicating the admin is already active
 *
 * This prevents privilege duplication and ensures business logic invariants
 * are enforced for admin state management.
 */
export async function test_api_admin_reinstate_admin_privileges_already_active_error(
  connection: api.IConnection,
) {
  // Step 1: Register a super-admin for performing admin operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: "StrongAdmin1@",
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUser);
  const adminUserId = adminUser.user.id;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Register a regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name();
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: "ValidPassword123!",
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);
  const userId = userJoin.user.id;

  // Step 3: Promote the regular user to admin
  const assignedAdmin =
    await api.functional.discussionBoard.admin.users.admin.assignAdmin(
      connection,
      {
        userId,
        body: {
          user_id: userId,
        } satisfies IDiscussionBoardAdmin.ICreate,
      },
    );
  typia.assert(assignedAdmin);
  TestValidator.predicate(
    "Assigned admin must be active after assignment",
    assignedAdmin.is_active,
  );

  // Step 4 & 5: Attempt to reinstate admin when already active, and confirm error
  await TestValidator.error(
    "Should error when reinstating privileges for already active admin",
    async () => {
      await api.functional.discussionBoard.admin.users.admin.reinstateAdmin(
        connection,
        {
          userId,
          body: {
            is_active: true,
          } satisfies IDiscussionBoardAdmin.IUpdate,
        },
      );
    },
  );
}
