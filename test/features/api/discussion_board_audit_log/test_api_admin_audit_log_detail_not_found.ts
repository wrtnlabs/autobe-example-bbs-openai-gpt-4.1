import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";

/**
 * Validate that requesting a non-existent audit log as an admin yields a
 * not-found error.
 *
 * This test covers the error path for GET
 * /discussionBoard/admin/auditLogs/{auditLogId} when the given auditLogId
 * does not correspond to any actual resource. To access this endpoint, a
 * valid admin authorization is required. The test proceeds by:
 *
 * 1. Creating an admin account via /auth/admin/join so that the connection has
 *    admin context.
 * 2. Using a freshly randomized UUID as auditLogId to maximize odds of it not
 *    matching any real log entry.
 * 3. Performing a GET request to the audit log detail endpoint with this
 *    random auditLogId.
 * 4. Expecting the API to return a not found (likely 404) error, indicating
 *    that the system robustly handles invalid input and does not expose
 *    sensitive details or crash.
 * 5. Asserts on this error response in a way that guarantees correct status
 *    and clear error signaling.
 */
export async function test_api_admin_audit_log_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Create admin & context via POST /auth/admin/join
  const adminInput: IDiscussionBoardAdmin.ICreate = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(adminAuth);

  // 2. Attempt to retrieve an audit log with a guaranteed-nonexistent ID (random UUID)
  const nonExistentAuditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3 & 4. Expect a not-found error
  await TestValidator.error(
    "GET /discussionBoard/admin/auditLogs/{auditLogId} with missing auditLogId should return NotFound",
    async () => {
      await api.functional.discussionBoard.admin.auditLogs.at(connection, {
        auditLogId: nonExistentAuditLogId,
      });
    },
  );
}
