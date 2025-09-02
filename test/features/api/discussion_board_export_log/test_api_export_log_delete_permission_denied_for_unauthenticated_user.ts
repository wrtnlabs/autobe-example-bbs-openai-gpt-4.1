import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardExportLog";

/**
 * Test permission denial for unauthenticated export log deletion.
 *
 * This E2E test verifies that deleting a discussion board export log
 * without authentication or with improper credentials is rejected by the
 * platform, ensuring role-based access control on sensitive audit/deletion
 * operations.
 *
 * Test Steps:
 *
 * 1. Create an admin user and join (to establish an admin context for setup).
 * 2. As that admin, create one export log entry (so we know a valid
 *    exportLogId).
 * 3. Simulate an UNAUTHENTICATED request (clear headers or use a fresh
 *    connection without Authorization header).
 * 4. Attempt to DELETE the export log using
 *    /discussionBoard/admin/exportLogs/{exportLogId}.
 * 5. Assert the system returns a permission error (such as 401/403) and that
 *    the log is not deleted (optional: if log can be fetched or
 *    reattempted).
 *
 * Optionally test with garbage/invalid Authorization header (e.g., expired,
 * malformed) as a secondary negative case.
 */
export async function test_api_export_log_delete_permission_denied_for_unauthenticated_user(
  connection: api.IConnection,
) {
  // 1. Create admin account to get a valid admin context.
  const adminUserId: string = typia.random<string & tags.Format<"uuid">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUserId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. As admin, create an export log.
  const exportLogCreate =
    await api.functional.discussionBoard.admin.exportLogs.create(connection, {
      body: {
        target_type: "audit",
        file_uri: `https://example.com/export/${typia.random<string & tags.Format<"uuid">>()}.log`,
        file_type: "application/json",
        exported_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
        status: "available",
        requested_by_user_id: adminUserId,
      } satisfies IDiscussionBoardExportLog.ICreate,
    });
  typia.assert(exportLogCreate);

  // 3. Simulate unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt DELETE as unauthenticated
  await TestValidator.error(
    "unauthenticated user cannot delete export log",
    async () =>
      await api.functional.discussionBoard.admin.exportLogs.erase(unauthConn, {
        exportLogId: exportLogCreate.id,
      }),
  );

  // 5. Optionally, simulate deletion with invalid Authorization header
  const invalidAuthConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer INVALIDTOKEN" },
  };
  await TestValidator.error(
    "improperly authenticated user cannot delete export log",
    async () =>
      await api.functional.discussionBoard.admin.exportLogs.erase(
        invalidAuthConn,
        {
          exportLogId: exportLogCreate.id,
        },
      ),
  );
}
