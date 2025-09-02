import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate that a moderator can query the moderator status of a specific
 * user.
 *
 * The scenario simulates a real-world moderator privilege workflow by
 * creating all necessary actors:
 *
 * - A standard user (target of the query)
 * - A moderator (who makes the query)
 * - An admin (who assigns moderator privileges)
 *
 * The workflow steps are:
 *
 * 1. Register a moderator account (for the session that ultimately issues the
 *    status query)
 * 2. Register a standard user account
 * 3. Register an admin account
 * 4. Log in as the admin to acquire admin privileges
 * 5. Use the admin to assign moderator status to the user
 * 6. Log in as the moderator (to switch context and access the protected
 *    endpoint)
 * 7. The moderator issues a PATCH request to fetch the moderator status of the
 *    user by ID
 *
 * Assertions include:
 *
 * - The returned moderator record includes the target user_id and
 *   is_active=true
 * - No revoked, suspended, or deleted fields (or all are null)
 * - Assigned_at, created_at, and updated_at dates are correctly present (ISO
 *   8601 parseable)
 * - Every API step returns an object matching the expected type signatures
 */
export async function test_api_moderator_patch_user_moderator_status(
  connection: api.IConnection,
) {
  // 1. Register moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Moderator!Pass123";
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(),
      password: moderatorPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorJoin);

  // 2. Register standard user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "User!Pass123";
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: RandomGenerator.name(),
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);
  const userId = userJoin.user.id;

  // 3. Register admin account: first as user, then as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin!Pass123";
  const adminUserJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      username: RandomGenerator.name(),
      password: adminPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUserJoin);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserJoin.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 4. Log in as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 5. Admin assigns moderator role to the user
  const moderatorAssign =
    await api.functional.discussionBoard.admin.users.moderator.assignModerator(
      connection,
      {
        userId,
        body: {
          user_id: userId,
        } satisfies IDiscussionBoardModerator.ICreate,
      },
    );
  typia.assert(moderatorAssign);

  // 6. Log in as moderator (context switch to query endpoint)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 7. Moderator fetches moderator status of user
  const modStatus =
    await api.functional.discussionBoard.moderator.users.moderator.moderatorStatus(
      connection,
      {
        userId,
        body: {} satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(modStatus);
  TestValidator.equals(
    "moderator status record's user id matches target",
    modStatus.user_id,
    userId,
  );
  TestValidator.equals("moderator status is active", modStatus.is_active, true);
  TestValidator.equals(
    "moderator status is not revoked",
    modStatus.revoked_at,
    null,
  );
  TestValidator.equals(
    "moderator status is not suspended",
    modStatus.suspended_until,
    null,
  );
  TestValidator.equals(
    "moderator status is not deleted",
    modStatus.deleted_at,
    null,
  );
  TestValidator.predicate(
    "assigned_at date is ISO8601",
    !!Date.parse(modStatus.assigned_at),
  );
  TestValidator.predicate(
    "created_at date is ISO8601",
    !!Date.parse(modStatus.created_at),
  );
  TestValidator.predicate(
    "updated_at date is ISO8601",
    !!Date.parse(modStatus.updated_at),
  );
}
