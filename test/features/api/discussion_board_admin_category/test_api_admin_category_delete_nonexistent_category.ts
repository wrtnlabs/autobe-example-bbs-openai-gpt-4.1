import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test that deleting a non-existent discussion board category as admin
 * fails with a not-found error.
 *
 * This test verifies that attempting to delete a discussion board category
 * with a random, non-existent categoryId as an authenticated admin will
 * fail with a relevant error (typically HTTP 404). No side effects or real
 * category deletions should occur, only error validation. The admin must be
 * properly registered and authenticated before attempting the operation.
 *
 * Steps:
 *
 * 1. Register and authenticate as an admin (obtain token/context).
 * 2. Generate a random UUID for a category that does not exist.
 * 3. Attempt to delete the category with this ID using the admin endpoint.
 * 4. Assert that the system responds with an error indicating the category was
 *    not found (using TestValidator.error).
 * 5. Do not create or manipulate any real categories in this test.
 */
export async function test_api_admin_category_delete_nonexistent_category(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Generate a random UUID which does NOT correspond to any existing category
  const nonexistentCategoryId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to delete the non-existent category as admin and assert error occurs
  await TestValidator.error(
    "should fail with not found on non-existent category deletion",
    async () => {
      await api.functional.discussionBoard.admin.categories.erase(connection, {
        categoryId: nonexistentCategoryId,
      });
    },
  );
}
