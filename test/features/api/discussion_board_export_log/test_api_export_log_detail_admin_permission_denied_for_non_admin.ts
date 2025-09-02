import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardExportLog";

/**
 * Validate that non-admin users cannot access discussion board export log
 * details (permission denied scenario).
 *
 * This test performs the following workflow:
 *
 * 1. Create an admin user (join as admin and auto-login)
 * 2. Register this user as admin (context switches to admin)
 * 3. Create an export log entry as admin (to obtain a valid exportLogId)
 * 4. Create a regular user account (join as standard member, switches
 *    connection context to non-admin)
 * 5. Attempt to read the export log details as the regular user (GET by
 *    exportLogId)
 * 6. Validate that a permission-denied error or forbidden access occurs (the
 *    endpoint strictly enforces admin-only access)
 *
 * This scenario is critical to ensure that sensitive export log/audit
 * records are not accessible to non-admin members, even if the export log
 * ID is known. It directly tests strict role-based access control for the
 * /discussionBoard/admin/exportLogs/{exportLogId} endpoint.
 */
export async function test_api_export_log_detail_admin_permission_denied_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Create a new admin user as a regular user (auto-login after this call)
  const adminUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12) + "A!1",
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUser);

  // 2. Register this user as an admin (now context is admin)
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUser.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 3. Create an export log entry as admin
  const exportLog =
    await api.functional.discussionBoard.admin.exportLogs.create(connection, {
      body: {
        target_type: RandomGenerator.pick([
          "user",
          "regulator",
          "admin",
          "legal",
        ] as const),
        file_uri: "/exports/" + RandomGenerator.alphaNumeric(16) + ".json",
        file_type: RandomGenerator.pick([
          "application/json",
          "application/pdf",
          "text/csv",
          "application/xml",
        ] as const),
        exported_at: new Date().toISOString(),
        status: RandomGenerator.pick([
          "pending",
          "available",
          "expired",
          "failed",
        ] as const),
        requested_by_user_id: adminUser.user.id,
      } satisfies IDiscussionBoardExportLog.ICreate,
    });
  typia.assert(exportLog);

  // 4. Create a regular user (switch context to a non-admin user)
  const regularUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12) + "Z!2",
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(regularUser);

  // 5. Attempt to access export log details as regular user
  await TestValidator.error(
    "non-admin access is forbidden for export log details",
    async () => {
      await api.functional.discussionBoard.admin.exportLogs.at(connection, {
        exportLogId: exportLog.id,
      });
    },
  );
}
