import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardExportLog";

/**
 * Test updating an export log fails for unauthenticated and non-admin
 * users.
 *
 * Validates that only admin users can update export logs. This test
 * performs the following:
 *
 * 1. Registers an admin account (via /auth/admin/join) with a random user
 *    UUID.
 * 2. Creates an export log as admin using the admin token (via
 *    /discussionBoard/admin/exportLogs) to get a valid exportLogId.
 * 3. Switches to an unauthenticated user context (removes authorization header
 *    from connection).
 * 4. Attempts to update the export log (via PUT
 *    /discussionBoard/admin/exportLogs/{exportLogId}) without any
 *    Authorization token. Asserts that this call fails with an
 *    authorization (401 or 403) error.
 * 5. (If supported) Attempts to perform the update as a basic authenticated
 *    non-admin user instead of admin, expecting the same denial (not
 *    implemented if only admin context is supported).
 * 6. Verifies no update was performed.
 */
export async function test_api_export_log_update_permission_denied_for_non_admin_or_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUserId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);
  const adminToken = adminJoin.token.access;

  // 2. Create an export log as admin
  const exportLog =
    await api.functional.discussionBoard.admin.exportLogs.create(connection, {
      body: {
        target_type: RandomGenerator.pick([
          "user",
          "regulator",
          "admin",
          "legal",
        ]),
        file_uri: `/files/exports/${typia.random<string & tags.Format<"uuid">>()}.json`,
        file_type: RandomGenerator.pick([
          "application/json",
          "application/pdf",
          "text/csv",
          "application/xml",
        ]),
        exported_at: new Date().toISOString(),
        status: RandomGenerator.pick([
          "pending",
          "available",
          "expired",
          "failed",
        ]),
        requested_by_user_id: adminUserId,
      } satisfies IDiscussionBoardExportLog.ICreate,
    });
  typia.assert(exportLog);
  const exportLogId = exportLog.id;

  // 3. Switch to unauthenticated connection (remove Authorization)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. Try to update export log as unauthenticated, expect authorization error
  await TestValidator.error(
    "unauthenticated user cannot update export log",
    async () => {
      await api.functional.discussionBoard.admin.exportLogs.update(unauthConn, {
        exportLogId,
        body: {
          status: RandomGenerator.pick([
            "pending",
            "available",
            "expired",
            "failed",
          ]),
        } satisfies IDiscussionBoardExportLog.IUpdate,
      });
    },
  );
  // 5. (Optionally, if system supports) Try as non-admin user - omitted as no non-admin join API is provided
}
