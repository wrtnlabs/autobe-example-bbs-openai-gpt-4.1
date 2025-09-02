import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardExportLog";

/**
 * Validate successful retrieval of export log audit detail by an
 * authenticated admin.
 *
 * 1. Register a new admin account (admin join).
 * 2. Create an export log entry to ensure a valid exportLogId exists.
 * 3. Retrieve export log details via GET
 *    /discussionBoard/admin/exportLogs/{exportLogId} as the admin.
 * 4. Confirm the returned export log contains all audit/compliance fields (id,
 *    target_type, file_uri, file_type, exported_at, status, created_at,
 *    updated_at, and if defined, requested_by_user_id, deleted_at).
 * 5. Validate that fields in the GET response match those provided at export
 *    log creation—except for audit fields set by the backend (e.g.,
 *    created_at).
 */
export async function test_api_export_log_detail_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin account (must use a unique user_id, simulated with typia.random).
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);
  TestValidator.predicate(
    "admin should be active after join",
    adminJoin.admin.is_active === true &&
      adminJoin.admin.user_id === adminUserId,
  );

  // 2. Create an export log entry as the authenticated admin.
  const exportLogInput = {
    target_type: RandomGenerator.pick([
      "user",
      "regulator",
      "admin",
      "legal",
    ] as const),
    file_uri: `https://files.example.com/exports/${typia.random<string & tags.Format<"uuid">>()}.json`,
    file_type: RandomGenerator.pick([
      "application/json",
      "application/pdf",
      "text/csv",
    ] as const),
    exported_at: new Date().toISOString(),
    status: RandomGenerator.pick([
      "pending",
      "available",
      "expired",
      "failed",
    ] as const),
    requested_by_user_id: adminUserId,
  } satisfies IDiscussionBoardExportLog.ICreate;
  const createdExportLog =
    await api.functional.discussionBoard.admin.exportLogs.create(connection, {
      body: exportLogInput,
    });
  typia.assert(createdExportLog);

  // 3. Retrieve export log audit detail by ID as admin.
  const retrievedExportLog =
    await api.functional.discussionBoard.admin.exportLogs.at(connection, {
      exportLogId: createdExportLog.id,
    });
  typia.assert(retrievedExportLog);

  // 4. Confirm all top-level fields are present and match expected audit/compliance semantics.
  TestValidator.equals(
    "export log ID matches created log",
    retrievedExportLog.id,
    createdExportLog.id,
  );
  TestValidator.equals(
    "export log target type matches",
    retrievedExportLog.target_type,
    exportLogInput.target_type,
  );
  TestValidator.equals(
    "export log file URI matches",
    retrievedExportLog.file_uri,
    exportLogInput.file_uri,
  );
  TestValidator.equals(
    "export log file type matches",
    retrievedExportLog.file_type,
    exportLogInput.file_type,
  );
  TestValidator.equals(
    "export log exported_at matches (ISO string)",
    retrievedExportLog.exported_at,
    exportLogInput.exported_at,
  );
  TestValidator.equals(
    "export log status matches",
    retrievedExportLog.status,
    exportLogInput.status,
  );
  TestValidator.equals(
    "created_at is ISO datetime",
    typeof retrievedExportLog.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is ISO datetime",
    typeof retrievedExportLog.updated_at,
    "string",
  );
  // Check requested_by_user_id if set
  TestValidator.equals(
    "requested_by_user_id matches adminUserId",
    retrievedExportLog.requested_by_user_id,
    adminUserId,
  );
}
