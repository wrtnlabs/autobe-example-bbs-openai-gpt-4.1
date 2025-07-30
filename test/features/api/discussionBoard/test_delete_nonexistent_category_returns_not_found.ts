import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate error handling when attempting to delete a discussion board category
 * using a non-existent categoryId (admin-only, hard delete).
 *
 * This test ensures that if an administrator attempts to delete a category with
 * an ID that does not exist in the database, the API responds with a proper not
 * found (404) or error indicator, and there is no impact on existing
 * categories.
 *
 * Test Steps:
 *
 * 1. Register an admin user using a valid admin creation API (prerequisite for
 *    privileged actions).
 * 2. Generate a random UUID to act as a non-existent categoryId (should not
 *    correspond to any actual category record).
 * 3. Attempt to delete the non-existent category as the registered admin.
 * 4. Validate that the API throws an error (ideally 404 not found or similar
 *    error), confirming correct handling of the case.
 * 5. Confirm that no existing categories are affected (see note below).
 *
 * Note: Since listing/getting categories is not covered by provided API, actual
 * data verification for unimpacted records is not implemented; this test
 * instead focuses on error validation for not found.
 */
export async function test_api_discussionBoard_test_delete_nonexistent_category_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register an admin user as a prerequisite for privileged endpoints
  const user_identifier: string = `admin_${typia.random<string>()}`;
  const now: string = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier,
        granted_at: now,
      } satisfies IDiscussionBoardAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Generate a random UUID to represent a non-existent categoryId
  const nonExistentCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3 & 4. Attempt to delete non-existent category and expect an error
  await TestValidator.error(
    "should return not found error when deleting non-existent category",
  )(async () => {
    await api.functional.discussionBoard.admin.categories.erase(connection, {
      categoryId: nonExistentCategoryId,
    });
  });
}
