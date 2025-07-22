import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Validate error handling when attempting to soft-delete a non-existent or already soft-deleted discussion board category.
 *
 * This test ensures the DELETE /discussionBoard/categories/{id} API correctly rejects attempts to delete:
 *   1. A category with a random (non-existent) UUID
 *   2. A category that has already been soft-deleted (deleted_at is set)
 *
 * The API should respond with an appropriate error (e.g., 404 Not Found or 409 Conflict) in each case, confirming robust handling of invalid deletion requests.
 *
 * Steps:
 * 1. Attempt to delete a category using a random UUID that is highly unlikely to exist, and verify that an error is returned.
 * 2. (If possible through available APIs) Create a category, delete it once, then attempt to delete it again using the same ID, and verify that the second attempt returns a not found or conflict error.
 *    - If there is no category creation API available, skip this step.
 */
export async function test_api_discussionBoard_categories_eraseById_test_delete_category_with_nonexistent_or_already_deleted_id(
  connection: api.IConnection,
) {
  // Step 1: Attempt to delete a non-existent category
  await TestValidator.error("Deleting a random/non-existent category ID should fail")(
    async () => {
      await api.functional.discussionBoard.categories.eraseById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Step 2: Cannot test already-deleted category scenario as no category creation or listing API is available
  // Skipped because only the eraseById function is provided.
}