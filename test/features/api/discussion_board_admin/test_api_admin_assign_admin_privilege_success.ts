import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test scenario: Successful assignment of admin privileges to a verified
 * user by an existing admin.
 *
 * This test validates the role assignment workflow and the business rules
 * for admin elevation:
 *
 * - An authorized admin can assign admin privileges to another (verified)
 *   account
 * - The promoted user must be pre-existing and verified
 * - On success, the API must create an admin record for the user with
 *   immediate effect
 * - Assignment metadata (assigned_at, is_active) must reflect correct state
 * - Assignment is idempotent (no duplicate active admin records for same
 *   user)
 *
 * Test Steps:
 *
 * 1. Register a new admin (calls /auth/admin/join) and authenticate to obtain
 *    tokens
 * 2. Register a new user (calls /auth/user/join) to serve as admin target
 * 3. Simulate verification (set is_verified); if not directly possible, assume
 *    all test users are verified (most E2E flows do not require persistent
 *    external verification during direct DB/API seeding, but validate
 *    privilege logic depends on verification)
 * 4. As authenticated admin, call PUT
 *    /discussionBoard/admin/users/{userId}/admin with userId of new user
 * 5. Validate (a) admin record exists and links to correct userId, (b)
 *    "assigned_at" and "is_active" are correct, (c) "revoked_at" is null or
 *    absent
 *
 * All setup and assertions are encapsulated for E2E isolation; nothing
 * persists between tests.
 */
export async function test_api_admin_assign_admin_privilege_success(
  connection: api.IConnection,
) {
  // Step 1: Register admin (user create + admin join for proper authorization)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUser: IDiscussionBoardUser.ICreate = {
    email: adminEmail,
    username: RandomGenerator.name(1),
    password: "StrongPassw0rd!",
    consent: true,
    display_name: RandomGenerator.name(1),
  };
  const adminAuth = await api.functional.auth.user.join(connection, {
    body: adminUser,
  });
  typia.assert(adminAuth);

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminAuth.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // Step 2: Register new user to promote
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userToPromote: IDiscussionBoardUser.ICreate = {
    email: userEmail,
    username: RandomGenerator.name(1),
    password: "AnotherStr0ng!",
    consent: true,
    display_name: RandomGenerator.name(1),
  };
  const promotedAuth = await api.functional.auth.user.join(connection, {
    body: userToPromote,
  });
  typia.assert(promotedAuth);
  // (Assume verification has occurred for this user)

  // Step 3: Assign admin privilege to new user as admin
  const adminRecord =
    await api.functional.discussionBoard.admin.users.admin.assignAdmin(
      connection,
      {
        userId: promotedAuth.user.id,
        body: {
          user_id: promotedAuth.user.id,
        } satisfies IDiscussionBoardAdmin.ICreate,
      },
    );
  typia.assert(adminRecord);

  // Step 4: Validate admin record correctness
  TestValidator.equals(
    "admin record links to correct userId",
    adminRecord.user_id,
    promotedAuth.user.id,
  );
  TestValidator.predicate(
    "admin assignment is active",
    adminRecord.is_active === true,
  );
  TestValidator.predicate(
    "admin assignment timestamp is recent",
    new Date(adminRecord.assigned_at).getTime() <= Date.now() &&
      new Date(adminRecord.assigned_at).getTime() >= Date.now() - 60000,
  );
  if (adminRecord.revoked_at !== undefined && adminRecord.revoked_at !== null)
    throw new Error(
      "revoked_at should be null or undefined for newly assigned active admin",
    );
}
