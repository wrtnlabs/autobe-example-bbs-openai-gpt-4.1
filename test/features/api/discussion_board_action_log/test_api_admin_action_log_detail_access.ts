import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActionLog";

/**
 * Validate that an admin can access a specific action log record by ID and
 * receive all expected fields.
 *
 * Test steps:
 *
 * 1. Register an admin using /auth/admin/join to obtain authentication and
 *    authorization context.
 * 2. Use a valid actionLogId (randomly generated UUID) to request
 *    /discussionBoard/admin/actionLogs/{actionLogId}.
 * 3. Verify the returned action log includes all properties as in the
 *    IDiscussionBoardActionLog schema:
 *
 *    - Id: UUID
 *    - Discussion_board_audit_log_id: UUID
 *    - Status: string
 *    - Metadata: string or null
 *    - Created_at: ISO8601 date-time
 * 4. Test negative scenario: try to access a non-existent actionLogId and
 *    ensure an error is returned (e.g., not-found).
 */
export async function test_api_admin_action_log_detail_access(
  connection: api.IConnection,
) {
  // 1. Register an admin and confirm authentication context
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: typia.random<IDiscussionBoardAdmin.ICreate>(),
  });
  typia.assert(adminAuthorized);

  // 2. Request a specific action log record (using a valid/random UUID)
  const actionLogId = typia.random<string & tags.Format<"uuid">>();
  const logDetail = await api.functional.discussionBoard.admin.actionLogs.at(
    connection,
    { actionLogId },
  );
  typia.assert(logDetail);
  // Validate schema properties individually
  TestValidator.predicate(
    "action log ID is uuid format",
    typeof logDetail.id === "string" && logDetail.id.length > 0,
  );
  TestValidator.predicate(
    "audit log id is uuid format",
    typeof logDetail.discussion_board_audit_log_id === "string" &&
      logDetail.discussion_board_audit_log_id.length > 0,
  );
  TestValidator.predicate(
    "status is string",
    typeof logDetail.status === "string",
  );
  TestValidator.predicate(
    "created_at is ISO8601",
    typeof logDetail.created_at === "string" && logDetail.created_at.length > 0,
  );

  // 3. Error scenario: Try with a non-existent/random UUID, should throw 404 or similar error
  const fakeActionLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Requesting non-existent action log returns error",
    async () => {
      await api.functional.discussionBoard.admin.actionLogs.at(connection, {
        actionLogId: fakeActionLogId,
      });
    },
  );
}
