import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActionLog";

/**
 * Validate not found error when requesting a nonexistent action log as
 * admin.
 *
 * This test ensures that the GET
 * /discussionBoard/admin/actionLogs/{actionLogId} endpoint with proper
 * admin authentication returns a not found error when an invalid or missing
 * actionLogId is requested.
 *
 * Steps:
 *
 * 1. Create an admin account and authenticate so the API call is authorized.
 * 2. Attempt to retrieve an action log with a randomly generated UUID that
 *    does not exist in the system.
 * 3. Assert that a not found error or appropriate HTTP error is thrown,
 *    validating correct error handling for missing resources.
 */
export async function test_api_admin_action_log_invalid_id_not_found_error(
  connection: api.IConnection,
) {
  // 1. Register an admin user for authentication
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuthorized);

  // 2. Attempt to access an action log with a random non-existent ID
  await TestValidator.error(
    "Should throw error when action log ID does not exist",
    async () => {
      await api.functional.discussionBoard.admin.actionLogs.at(connection, {
        actionLogId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
