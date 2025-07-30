import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate deletion of a revoked admin account from the system.
 *
 * Business context: To ensure full admin lifecycle management, the system must
 * allow hard deletion of admins whose privileges have already been revoked
 * (revoked_at set). This simulates offboarding/cleanup in compliance settings
 * where a previously-privileged user must be securely removed.
 *
 * Test steps:
 *
 * 1. Create a new admin assignment (role grant) for a unique user_identifier.
 * 2. Update this admin record to set 'revoked_at' (mark admin as revoked/disabled,
 *    but not deleted).
 * 3. Attempt to delete the admin entity (should succeed, since it is revoked).
 * 4. Confirm API returns success (void, no content).
 * 5. Optionally, attempt another delete or update on the same admin and expect not
 *    found / failure.
 * 6. Ensure that, after deletion, the admin account really is gone (future GET if
 *    available would 404 — but not implementable with current API, so skip that
 *    step).
 */
export async function test_api_discussionBoard_admin_admins_test_delete_admin_revoked_admin(
  connection: api.IConnection,
) {
  // 1. Create admin assignment
  const uniqueUserIdentifier = "admin-" + RandomGenerator.alphaNumeric(12);
  const grantTime = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: uniqueUserIdentifier,
        granted_at: grantTime,
        revoked_at: null,
      } satisfies IDiscussionBoardAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Update admin to set revoked_at (simulate revocation before deletion)
  const revokeTime = new Date(Date.now() + 1_000).toISOString();
  const revokedAdmin = await api.functional.discussionBoard.admin.admins.update(
    connection,
    {
      adminId: admin.id,
      body: {
        revoked_at: revokeTime,
      } satisfies IDiscussionBoardAdmin.IUpdate,
    },
  );
  typia.assert(revokedAdmin);
  TestValidator.equals("admin revoked_at set")(revokedAdmin.revoked_at)(
    revokeTime,
  );

  // 3. Delete the revoked admin
  const result = await api.functional.discussionBoard.admin.admins.erase(
    connection,
    {
      adminId: admin.id,
    },
  );
  TestValidator.equals("admin erase returns undefined")(result)(undefined);

  // 4. Attempt to delete again (should fail, e.g. NotFound) — error test
  await TestValidator.error("double deletion fails")(() =>
    api.functional.discussionBoard.admin.admins.erase(connection, {
      adminId: admin.id,
    }),
  );

  // 5. Attempt to update deleted admin (should fail, e.g. NotFound) — error test
  await TestValidator.error("update after delete fails")(() =>
    api.functional.discussionBoard.admin.admins.update(connection, {
      adminId: admin.id,
      body: { revoked_at: null },
    }),
  );
}
