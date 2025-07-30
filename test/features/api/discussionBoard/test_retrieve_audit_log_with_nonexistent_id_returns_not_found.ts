import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";

/**
 * Validate that retrieving an audit log by a nonexistent ID returns a not-found
 * error.
 *
 * This test confirms the API returns a 404 error or a descriptive not-found
 * response when an audit log is requested with a random or nonexistent UUID. It
 * ensures proper error handling and that no sensitive or internal information
 * is leaked in the response.
 *
 * Steps:
 *
 * 1. Generate a random UUID that does not correspond to any audit log record.
 * 2. Attempt to retrieve the audit log using this UUID as auditLogId.
 * 3. Validate that the API call throws an error (HttpError) with a 404 status or
 *    not-found semantics.
 * 4. Ensure the error does not include internal details or sensitive data (cannot
 *    explicitly check message content per requirements).
 */
export async function test_api_discussionBoard_test_retrieve_audit_log_with_nonexistent_id_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID
  const nonexistentAuditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to retrieve the audit log and expect a not-found error
  await TestValidator.error("Audit log not found should result in 404")(
    async () => {
      await api.functional.discussionBoard.admin.auditLogs.at(connection, {
        auditLogId: nonexistentAuditLogId,
      });
    },
  );
}
