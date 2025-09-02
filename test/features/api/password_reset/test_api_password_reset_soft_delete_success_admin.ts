import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful soft deletion of a password reset record by an admin.
 *
 * This test ensures that an administrator with proper authentication can
 * soft-delete a password reset record by its UUID, and that the operation
 * is idempotent. Because there is no password reset creation, fetching, or
 * listing API exposed for E2E test context, this test will:
 *
 * 1. Register and login as a new admin using /auth/admin/join
 * 2. Simulate existence of a password reset token (random UUID)
 * 3. Call DELETE /discussionBoard/admin/passwordResets/{passwordResetId} as
 *    the admin
 * 4. Assert that the DELETE completes successfully (no error thrown)
 * 5. Call DELETE a second time on the same ID to verify idempotency (should
 *    not fail)
 *
 * NOTE: Deep verification of the deleted_at field or resource lookup
 * post-deletion is not possible here due to missing password reset
 * read/list or audit APIs. The test performs all available assertions for
 * this API contract.
 */
export async function test_api_password_reset_soft_delete_success_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);
  const admin = adminAuth.admin;
  TestValidator.predicate(
    "admin is active after join",
    admin.is_active === true &&
      (admin.revoked_at === null || admin.revoked_at === undefined),
  );

  // 2. Simulate existence of a password reset record
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();

  // 3. DELETE password reset as authenticated admin
  await api.functional.discussionBoard.admin.passwordResets.erase(connection, {
    passwordResetId,
  });

  // 4. Try DELETE again (idempotency check)
  await api.functional.discussionBoard.admin.passwordResets.erase(connection, {
    passwordResetId,
  });
}
