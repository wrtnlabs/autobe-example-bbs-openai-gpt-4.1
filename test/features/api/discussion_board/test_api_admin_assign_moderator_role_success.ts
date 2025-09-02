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
 * Test that an admin can assign moderator privileges to a regular user
 * successfully.
 *
 * Business context:
 *
 * - Only admins can assign the moderator role to discussion board users,
 *   using the dedicated admin endpoint.
 * - The privilege assignment must be idempotent: repeated assignments for the
 *   same user should not fail or create duplicates.
 * - Proper audit trails and status fields should be handled by the backend;
 *   test assures the basic contract here.
 *
 * Steps:
 *
 * 1. Register a new regular user (will become moderator)
 * 2. Register another user as the future admin
 * 3. Assign admin privileges to that user
 * 4. Log in as admin to establish session
 * 5. As admin, assign moderator privileges to the first user
 * 6. Validate the assignment: correct user, is_active, timestamps, and no
 *    revoked/suspended fields set
 * 7. Re-assign moderator to confirm idempotency
 */
export async function test_api_admin_assign_moderator_role_success(
  connection: api.IConnection,
) {
  // 1. Register the regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.alphaNumeric(10);
  const userPassword = RandomGenerator.alphaNumeric(12) + "Aa@1";
  const regularUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(regularUser);

  // 2. Register the admin candidate user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminPassword = RandomGenerator.alphaNumeric(12) + "Aa@1";
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUser);

  // 3. Assign admin privileges
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUser.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuthorized);

  // 4. Log in as admin
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string & tags.Format<"password">,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 5. Admin assigns moderator privileges to the regular user
  const assignResult1 =
    await api.functional.discussionBoard.admin.users.moderator.assignModerator(
      connection,
      {
        userId: regularUser.user.id,
        body: {
          user_id: regularUser.user.id,
        } satisfies IDiscussionBoardModerator.ICreate,
      },
    );
  typia.assert(assignResult1);
  TestValidator.equals(
    "assigned moderator user_id matches input",
    assignResult1.user_id,
    regularUser.user.id,
  );
  TestValidator.predicate(
    "assigned moderator is active",
    assignResult1.is_active,
  );
  TestValidator.equals(
    "assigned moderator revoked_at is null",
    assignResult1.revoked_at ?? null,
    null,
  );
  TestValidator.equals(
    "assigned moderator suspended_until is null",
    assignResult1.suspended_until ?? null,
    null,
  );
  TestValidator.predicate(
    "assigned moderator assigned_at present",
    typeof assignResult1.assigned_at === "string" &&
      assignResult1.assigned_at.length > 0,
  );
  TestValidator.predicate(
    "assigned moderator created_at present",
    typeof assignResult1.created_at === "string" &&
      assignResult1.created_at.length > 0,
  );
  TestValidator.predicate(
    "assigned moderator updated_at present",
    typeof assignResult1.updated_at === "string" &&
      assignResult1.updated_at.length > 0,
  );

  // 6. Idempotency: assigning moderator again should succeed, return same user, fields consistent
  const assignResult2 =
    await api.functional.discussionBoard.admin.users.moderator.assignModerator(
      connection,
      {
        userId: regularUser.user.id,
        body: {
          user_id: regularUser.user.id,
        } satisfies IDiscussionBoardModerator.ICreate,
      },
    );
  typia.assert(assignResult2);
  TestValidator.equals(
    "second assignment is same moderator user_id",
    assignResult2.user_id,
    assignResult1.user_id,
  );
  TestValidator.equals(
    "second assignment is_active matches",
    assignResult2.is_active,
    assignResult1.is_active,
  );
  TestValidator.equals(
    "second assignment assigned_at matches",
    assignResult2.assigned_at,
    assignResult1.assigned_at,
  );
  TestValidator.equals(
    "second assignment created_at matches",
    assignResult2.created_at,
    assignResult1.created_at,
  );
  TestValidator.equals(
    "second assignment updated_at matches",
    assignResult2.updated_at,
    assignResult1.updated_at,
  );
  TestValidator.equals(
    "second assignment revoked_at matches",
    assignResult2.revoked_at ?? null,
    assignResult1.revoked_at ?? null,
  );
  TestValidator.equals(
    "second assignment suspended_until matches",
    assignResult2.suspended_until ?? null,
    assignResult1.suspended_until ?? null,
  );
}
