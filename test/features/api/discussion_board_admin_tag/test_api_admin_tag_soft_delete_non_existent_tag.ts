import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test error handling when attempting to soft delete a non-existent tag as
 * an admin.
 *
 * This test assumes a simulated/random-data environment where admin join
 * succeeds with a random user_id. In a real backend system, ensure that
 * admin join references a valid/verified user before use.
 *
 * Steps:
 *
 * 1. Register a new admin to obtain admin authentication.
 * 2. Attempt to soft-delete (erase) a tag using a random UUID that is not
 *    present in the system.
 * 3. Validate that the operation reliably fails with a 404 Not Found error,
 *    proving that the endpoint properly enforces resource existence
 *    checks.
 */
export async function test_api_admin_tag_soft_delete_non_existent_tag(
  connection: api.IConnection,
) {
  // 1. Register as admin and acquire authentication token (see note regarding user_id in live backend).
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUserId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Generate a UUID for a tag that certainly does not exist (no tags created in test).
  const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to soft-delete the missing tag and assert 404 Not Found error is returned.
  await TestValidator.httpError(
    "soft delete non-existent tag as admin should return 404 error",
    404,
    async () => {
      await api.functional.discussionBoard.admin.tags.erase(connection, {
        tagId: nonExistentTagId,
      });
    },
  );
}
