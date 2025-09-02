import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";

/**
 * Test updating an appeal record as admin that does not exist.
 *
 * This test ensures that the system properly handles attempts to update an
 * appeal record by an authenticated admin when the targeted appeal does not
 * exist.
 *
 * Steps:
 *
 * 1. Register an admin using the join endpoint to establish authentication
 *    context.
 * 2. Attempt to update a non-existent appeal using a randomly generated UUID.
 *    Provide a valid update payload (e.g., new reason, status, resolution
 *    comment).
 * 3. Expect the update call to fail (error thrown) because the appeal ID does
 *    not exist.
 * 4. Use TestValidator.error() to confirm the API blocks the operation and
 *    throws as expected.
 */
export async function test_api_admin_appeal_update_not_found(
  connection: api.IConnection,
) {
  // 1. Register admin and establish authenticated context
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Attempt to update a non-existent appeal
  await TestValidator.error(
    "updating a non-existent appeal as admin should fail",
    async () => {
      await api.functional.discussionBoard.admin.appeals.update(connection, {
        appealId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
          status: "resolved",
          resolution_comment: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAppeal.IUpdate,
      });
    },
  );
}
