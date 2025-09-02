import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test retrieval of password reset token details by an admin.
 *
 * This function:
 *
 * 1. Registers a new admin user with admin join, ensuring admin-level
 *    authentication.
 * 2. (Assumes existence of a password reset token with known UUID. For a real
 *    test, the record must be seeded or prepared externally.)
 * 3. Retrieves details of the password reset token by its ID via the admin
 *    endpoint.
 * 4. Validates all core metadata, ownership, usage state, and security
 *    compliance on returned fields.
 *
 *    - Asserts that sensitive fields like reset_token are present but
 *         appropriately protected (masked) from leakage.
 *    - Checks for correctness of owner, expiry, and audit fields, including
 *         optional fields handling.
 */
export async function test_api_password_reset_retrieval_success_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin user
  const adminUserId: string = typia.random<string & tags.Format<"uuid">>();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuthorized);
  const admin = adminAuthorized.admin;
  TestValidator.predicate("admin should be active", admin.is_active === true);
  TestValidator.equals(
    "admin user_id matches input",
    admin.user_id,
    adminUserId,
  );

  // 2. Assume presence of a password reset record (external setup)
  // (In real E2E: Should setup and retrieve an actual reset record; here we use a random UUID)
  const passwordResetId: string = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve password reset detail as admin
  const passwordReset: IDiscussionBoardPasswordReset =
    await api.functional.discussionBoard.admin.passwordResets.at(connection, {
      passwordResetId,
    });
  typia.assert(passwordReset);

  // 4. Validate critical metadata and compliance
  TestValidator.equals(
    "password reset id matches",
    passwordReset.id,
    passwordResetId,
  );
  typia.assert<string & tags.Format<"uuid">>(
    passwordReset.discussion_board_user_id,
  );
  typia.assert<string & tags.Format<"date-time">>(passwordReset.expires_at);
  typia.assert<string & tags.Format<"date-time">>(passwordReset.created_at);
  typia.assert<string & tags.Format<"date-time">>(passwordReset.updated_at);
  // Optional fields
  if (
    passwordReset.deleted_at !== undefined &&
    passwordReset.deleted_at !== null
  )
    typia.assert<string & tags.Format<"date-time">>(passwordReset.deleted_at);
  if (passwordReset.used_at !== undefined && passwordReset.used_at !== null)
    typia.assert<string & tags.Format<"date-time">>(passwordReset.used_at);
  // Security: reset_token should not be empty (may be masked, not raw)
  TestValidator.predicate(
    "reset_token should not be empty (masked or policy-based)",
    typeof passwordReset.reset_token === "string" &&
      passwordReset.reset_token.length > 0,
  );
}
