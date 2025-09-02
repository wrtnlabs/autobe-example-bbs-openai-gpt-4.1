import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardExportLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardExportLog";

/**
 * E2E test: Update discussion board export log and validate status
 * transitions (admin).
 *
 * This test verifies that an administrator can successfully update an
 * existing export log record. It validates both status transitions and
 * field updates, as well as correct audit data handling. The business
 * scenario is as follows:
 *
 * 1. Register and log in as an admin using POST /auth/admin/join, granting
 *    root permissions.
 * 2. Create an initial export log with POST /discussionBoard/admin/exportLogs.
 *    Set status to 'pending'. Capture all returned details, including audit
 *    fields.
 * 3. Call PUT /discussionBoard/admin/exportLogs/{exportLogId} to change status
 *    to 'available' and update file_uri to a new unique value. Optionally,
 *    update file_type and exported_at as part of the update test.
 * 4. Assert that the export log was indeed updated: status and file_uri match
 *    the update request, and updated_at has advanced compared to the
 *    original record.
 * 5. Validate that no unintended fields were altered (e.g., created_at remains
 *    unchanged).
 *
 * This test ensures strict business logic and compliance with admin-only
 * update policy. It also provides coverage over status transitions and
 * audit traceability.
 */
export async function test_api_export_log_update_success_and_status_transition(
  connection: api.IConnection,
) {
  // 1. Register and log in as admin
  const adminUserId: string = typia.random<string & tags.Format<"uuid">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create new export log as admin (status: 'pending')
  const initialExportLogInput: IDiscussionBoardExportLog.ICreate = {
    target_type: RandomGenerator.pick(["user", "regulator", "admin", "legal"]),
    file_uri: `https://files.example.com/export/${typia.random<string & tags.Format<"uuid">>()}.json`,
    file_type: RandomGenerator.pick([
      "application/json",
      "application/pdf",
      "text/csv",
      "application/xml",
    ]),
    exported_at: new Date().toISOString(),
    status: "pending",
    requested_by_user_id: adminUserId,
  };
  const createdExportLog =
    await api.functional.discussionBoard.admin.exportLogs.create(connection, {
      body: initialExportLogInput,
    });
  typia.assert(createdExportLog);

  // 3. Prepare update: set status to 'available', change file_uri & exported_at, set a different file_type
  const updatedFileUri = `https://files.example.com/export/${typia.random<string & tags.Format<"uuid">>()}.json`;
  const updatePayload: IDiscussionBoardExportLog.IUpdate = {
    status: "available",
    file_uri: updatedFileUri,
    exported_at: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5 minutes into the future
    file_type:
      createdExportLog.file_type !== "application/pdf"
        ? "application/pdf"
        : "application/json",
  };
  const updatedExportLog =
    await api.functional.discussionBoard.admin.exportLogs.update(connection, {
      exportLogId: createdExportLog.id,
      body: updatePayload,
    });
  typia.assert(updatedExportLog);

  // 4. Assert values: status/file_uri/file_type/exported_at/updated_at
  TestValidator.equals(
    "Updated export log status is available",
    updatedExportLog.status,
    "available",
  );
  TestValidator.equals(
    "Updated export log file_uri matches update",
    updatedExportLog.file_uri,
    updatedFileUri,
  );
  TestValidator.equals(
    "Updated export log file_type matches update",
    updatedExportLog.file_type,
    updatePayload.file_type,
  );
  TestValidator.equals(
    "Updated export log exported_at matches update",
    updatedExportLog.exported_at,
    updatePayload.exported_at,
  );
  TestValidator.predicate(
    "Export log updated_at advanced",
    new Date(updatedExportLog.updated_at) >
      new Date(createdExportLog.updated_at),
  );
  TestValidator.equals(
    "Export log created_at is unchanged",
    updatedExportLog.created_at,
    createdExportLog.created_at,
  );
  TestValidator.equals(
    "Export log id remains the same",
    updatedExportLog.id,
    createdExportLog.id,
  );
  TestValidator.equals(
    "Export log target_type remains the same",
    updatedExportLog.target_type,
    createdExportLog.target_type,
  );
  TestValidator.equals(
    "Export log requested_by_user_id remains the same",
    updatedExportLog.requested_by_user_id,
    createdExportLog.requested_by_user_id,
  );
}
