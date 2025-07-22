import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Validates 404 error handling when retrieving a discussion board category with a non-existent UUID.
 *
 * Ensures the GET /discussionBoard/categories/{id} endpoint does not leak sensitive information and correctly returns a not found error when the requested category does not exist. This test does not require any real category in the system and does not attempt to validate error structures beyond error occurrence.
 *
 * Steps:
 * 1. Generate a random UUID that almost certainly does not correspond to any existing category.
 * 2. Attempt to fetch category details via the API using this UUID.
 * 3. Validate that a 404 not found error is triggered (using TestValidator.error).
 */
export async function test_api_discussionBoard_test_get_category_detail_with_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Generate a non-existent category UUID
  const fakeCategoryId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to fetch the category and assert that a 404 error occurs
  await TestValidator.error("Should throw 404 when category is missing")(
    async () => {
      await api.functional.discussionBoard.categories.getById(connection, {
        id: fakeCategoryId,
      });
    },
  );
}