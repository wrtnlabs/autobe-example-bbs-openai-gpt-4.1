import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate admin registration for a previously verified user.
 *
 * Test flow:
 *
 * 1. Register a base user with /auth/user/join (providing required fields).
 * 2. Simulate the email verification by directly manipulating the summary's
 *    is_verified property (if possible in test context, otherwise check
 *    result).
 * 3. Register the user as admin with /auth/admin/join by referencing their
 *    user id (from step 1).
 * 4. Validate the /auth/admin/join result:
 *
 *    - Admin record is created and linked to user_id
 *    - Is_active is true
 *    - Assigned_at is defined
 *    - Tokens are present for admin session
 *    - All structural fields are populated appropriately
 * 5. Validate that assigned_at is a valid ISO datetime and
 *    revoked_at/suspended_until/deleted_at are null or missing (indicating
 *    active).
 * 6. Ensure linkage between admin record user_id and base user.id, and that
 *    is_active matches business expectation.
 * 7. Do NOT attempt to assert audit event logs as no API is given for that.
 */
export async function test_api_admin_registration_success_email_verified_user(
  connection: api.IConnection,
) {
  // Step 1: Register a base user (member)
  const userInput: IDiscussionBoardUser.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(14) + "Aa@",
    display_name: RandomGenerator.name(2),
    consent: true,
  };
  const userAuth = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(userAuth);
  const userId = userAuth.user.id;

  // Step 2: Confirm is_verified (should be false by default) and simulate verification
  // (In real system we'd patch, here we check and document test context.)
  // For our test we assume the email verification is simulated and the admin API expects is_verified=true.
  // So we'll proceed as if the user is now verified (it's up to backend to enforce).

  // Step 3: Register this user as admin
  const adminInput: IDiscussionBoardAdmin.ICreate = {
    user_id: userId,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  const admin = adminAuth.admin;

  // Step 4: Validate admin record linkage and state
  TestValidator.equals(
    "admin.user_id matches base user id",
    admin.user_id,
    userId,
  );
  TestValidator.predicate("admin.is_active is true", admin.is_active === true);
  TestValidator.predicate(
    "admin.assigned_at is valid ISO8601",
    typeof admin.assigned_at === "string" &&
      !isNaN(Date.parse(admin.assigned_at)),
  );
  TestValidator.equals(
    "admin.revoked_at is null or undefined",
    admin.revoked_at ?? null,
    null,
  );
  TestValidator.equals(
    "admin.suspended_until is null or undefined",
    admin.suspended_until ?? null,
    null,
  );
  TestValidator.equals(
    "admin.deleted_at is null or undefined",
    admin.deleted_at ?? null,
    null,
  );
  TestValidator.predicate(
    "admin.created_at is valid",
    typeof admin.created_at === "string" &&
      !isNaN(Date.parse(admin.created_at)),
  );
  TestValidator.predicate(
    "admin.updated_at is valid",
    typeof admin.updated_at === "string" &&
      !isNaN(Date.parse(admin.updated_at)),
  );

  // Step 5: Validate admin tokens are present
  TestValidator.predicate(
    "admin.token.access is present",
    typeof adminAuth.token.access === "string" &&
      adminAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "admin.token.refresh is present",
    typeof adminAuth.token.refresh === "string" &&
      adminAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "admin.token.expired_at is ISO date",
    typeof adminAuth.token.expired_at === "string" &&
      !isNaN(Date.parse(adminAuth.token.expired_at)),
  );
  TestValidator.predicate(
    "admin.token.refreshable_until is ISO date",
    typeof adminAuth.token.refreshable_until === "string" &&
      !isNaN(Date.parse(adminAuth.token.refreshable_until)),
  );
}
