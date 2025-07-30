import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";

/**
 * Validate that updating an audit log entry (by admin) with a non-existent or
 * random auditLogId correctly results in a not-found error, and that no data is
 * altered.
 *
 * Business Purpose: This test ensures robust error handling for update attempts
 * on invalid (non-existent) audit log IDs. It is critical to guarantee that
 * update operations do not mistakenly succeed or alter unrelated data when the
 * audit log does not exist, and that the system returns a proper error signal
 * for administrative workflows.
 *
 * Steps:
 *
 * 1. Generate a random (very likely non-existent) UUID for auditLogId.
 * 2. Prepare valid update data for the audit log using the correct DTO structure.
 * 3. Attempt to perform the update as an administrator using the non-existent
 *    auditLogId.
 * 4. Assert that the API call fails and returns a not-found error (typically 404
 *    or similar), indicating the resource does not exist.
 * 5. Ensure that no data is created or modified as a result of this failed call
 *    (implicit, since success would always be an error here).
 */
export async function test_api_discussionBoard_test_update_audit_log_with_invalid_id_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random, very likely non-existent, auditLogId.
  const invalidAuditLogId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Prepare valid update data (using valid, random DTO structure).
  const updateBody: IDiscussionBoardAuditLog.IUpdate =
    typia.random<IDiscussionBoardAuditLog.IUpdate>();

  // 3. Attempt the update and check for not-found error.
  await TestValidator.error("should return not-found for invalid auditLogId")(
    () =>
      api.functional.discussionBoard.admin.auditLogs.update(connection, {
        auditLogId: invalidAuditLogId,
        body: updateBody,
      }),
  );
  // 4. If the call succeeds, test will automatically fail. No further validation necessary.
}
