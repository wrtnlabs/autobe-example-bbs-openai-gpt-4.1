import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate error is thrown when deleting a nonexistent audit log.
 *
 * Attempts to hard-delete an audit log from the discussion board admin audit
 * log table using a random, non-existent auditLogId (UUID).
 *
 * Steps:
 *
 * 1. Generate a random UUID that is unlikely to match any actual audit log in the
 *    system.
 * 2. Attempt to delete the audit log with this nonexistent id via the admin erase
 *    endpoint.
 * 3. Confirm that a not-found error is thrown (business logic error for missing
 *    resource).
 * 4. Since there are no accessible list/get endpoints for audit logs, we rely on
 *    error reporting alone for this validation.
 */
export async function test_api_discussionBoard_test_delete_audit_log_with_invalid_id_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a fake audit log UUID (unlikely to exist in the system)
  const fakeAuditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2 & 3. Try deleting with a nonexistent ID and confirm a not-found error is thrown
  await TestValidator.error(
    "should return not-found error for nonexistent audit log",
  )(async () => {
    await api.functional.discussionBoard.admin.auditLogs.erase(connection, {
      auditLogId: fakeAuditLogId,
    });
  });

  // 4. No data state change validation possible without read/list endpoints
}
