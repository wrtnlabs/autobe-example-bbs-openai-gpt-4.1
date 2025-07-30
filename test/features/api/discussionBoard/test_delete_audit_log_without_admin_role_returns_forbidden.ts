import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";

/**
 * Validate that non-admins cannot delete audit logs (authorization
 * enforcement).
 *
 * Business Context: Audit logs contain critical security/compliance records and
 * must not be alterable except by admins. This test ensures the delete endpoint
 * enforces admin-only access, denying delete operations from non-admin users.
 *
 * Workflow:
 *
 * 1. As admin, create a new audit log entry to obtain a valid auditLogId
 *    (dependency).
 * 2. (Simulate) switch to a connection context without admin privileges by
 *    completely removing the Authorization header.
 * 3. Attempt to delete the audit log entry just created.
 * 4. Assert that an authorization error (forbidden/unauthorized) is thrown,
 *    confirming that only admins can delete audit logs.
 *
 * Notes:
 *
 * - No attempt to test with invalid auditLogId (that would be a different test).
 * - Assumes role-switch uses existing connection/session mechanics.
 */
export async function test_api_discussionBoard_test_delete_audit_log_without_admin_role_returns_forbidden(
  connection: api.IConnection,
) {
  // 1. Create an audit log entry as admin (dependency)
  const auditLog = await api.functional.discussionBoard.admin.auditLogs.create(
    connection,
    {
      body: {
        action_type: "test_non_admin_delete",
        actor_id: null,
        target_id: null,
        action_detail: "Testing delete prohibition for non-admins",
      } satisfies IDiscussionBoardAuditLog.ICreate,
    },
  );
  typia.assert(auditLog);

  // 2. (Simulate) use non-admin role by removing Authorization header
  const { Authorization, ...restHeaders } = connection.headers ?? {};
  const nonAdminConnection = {
    ...connection,
    headers: restHeaders,
  };

  // 3. Attempt to delete the audit log as non-admin and assert forbidden error
  await TestValidator.error(
    "Non-admin should not be able to delete audit logs",
  )(async () => {
    await api.functional.discussionBoard.admin.auditLogs.erase(
      nonAdminConnection,
      { auditLogId: auditLog.id },
    );
  });
}
