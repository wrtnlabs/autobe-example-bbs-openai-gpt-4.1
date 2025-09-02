import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardExportLog";

/**
 * Verify that unauthenticated users cannot create export logs (admin-only
 * endpoint).
 *
 * This test attempts to access the POST /discussionBoard/admin/exportLogs
 * endpoint using an unauthenticated connection. The endpoint should refuse
 * access and return an authorization error (401/403).
 *
 * Steps:
 *
 * 1. Create a fresh API connection with no Authorization header (representing
 *    an unauthenticated user).
 * 2. Prepare a valid IDiscussionBoardExportLog.ICreate payload with random
 *    data.
 * 3. Attempt to call api.functional.discussionBoard.admin.exportLogs.create.
 * 4. Assert that an authorization/permission error occurs (401 or 403).
 * 5. Confirm no export log is created for unauthenticated attempts.
 */
export async function test_api_export_log_creation_permission_denied_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated API connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Build a valid export log creation payload
  const payload = {
    target_type: RandomGenerator.pick([
      "user",
      "regulator",
      "admin",
      "legal",
      "compliance",
    ] as const),
    file_uri: `/exports/${RandomGenerator.alphaNumeric(12)}.csv`,
    file_type: RandomGenerator.pick([
      "application/json",
      "application/pdf",
      "text/csv",
      "application/xml",
    ] as const),
    exported_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    status: RandomGenerator.pick([
      "pending",
      "available",
      "expired",
      "failed",
    ] as const),
    requested_by_user_id: null, // No authenticated user
  } satisfies IDiscussionBoardExportLog.ICreate;

  // 3. Attempt the API call and expect an authorization error
  await TestValidator.error(
    "unauthenticated users cannot create export logs",
    async () => {
      await api.functional.discussionBoard.admin.exportLogs.create(unauthConn, {
        body: payload,
      });
    },
  );
}
