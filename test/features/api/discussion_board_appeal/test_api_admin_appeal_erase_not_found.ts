import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * Validate that attempting to soft-delete a non-existent discussion board
 * appeal as an admin results in a not found error.
 *
 * This test checks the platform's error-handling and auditing logic for
 * privileged soft deletion by covering the negative scenario: deleting an
 * appeal with a UUID that does not exist in the system. It follows this
 * workflow:
 *
 * 1. Register and authenticate an admin user (required authorization for erase
 *    operation).
 * 2. Attempt to soft-delete (retire) a discussion board appeal using a random
 *    or non-existent UUID.
 * 3. Validate that the system returns an appropriate not found error (HTTP
 *    404), confirming reliable error response semantics and that operation
 *    is safely audited without side effects.
 */
export async function test_api_admin_appeal_erase_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin account to obtain required authorization
  const adminJoinPayload = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinPayload,
  });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin was granted active account",
    adminAuth.admin.is_active === true,
  );

  // 2. Attempt to delete a non-existent appeal (use random UUID so it does not exist)
  const nonExistentAppealId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "soft-deleting a non-existent appeal should result in not found error",
    async () => {
      await api.functional.discussionBoard.admin.appeals.erase(connection, {
        appealId: nonExistentAppealId,
      });
    },
  );
}
