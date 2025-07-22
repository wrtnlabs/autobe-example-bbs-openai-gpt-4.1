import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Validate soft-deletion of a discussion board category via the DELETE endpoint.
 *
 * This test ensures that deleting (soft-deleting) a category sets its deleted_at timestamp
 * and that double-deletion triggers an error. Category soft-deletion is crucial for audit
 * trails and reversible admin workflows, as per compliance and business requirements.
 *
 * Steps:
 * 1. Create a new, unique discussion board category as a test fixture.
 * 2. Soft-delete the just-created category using DELETE /discussionBoard/categories/{id}.
 * 3. Validate that the returned deleted category's deleted_at is set (not null).
 * 4. Attempt to delete the same category again—expect an error.
 * 5. (Category listings/exclusion check skipped since no list/get endpoint in supplied SDK.)
 */
export async function test_api_discussionBoard_test_delete_category_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a unique category as a target for deletion
  const name = `category_${RandomGenerator.alphaNumeric(8)}`;
  const createBody: IDiscussionBoardCategory.ICreate = {
    name,
    description: RandomGenerator.paragraph()(),
  };
  const category = await api.functional.discussionBoard.categories.post(connection, {
    body: createBody,
  });
  typia.assert(category);

  // 2. Soft-delete the created category
  const deleted = await api.functional.discussionBoard.categories.eraseById(connection, {
    id: category.id,
  });
  typia.assert(deleted);

  // 3. Validate deleted_at field is set (soft-delete confirmed)
  TestValidator.predicate("deleted_at should be set after deletion")(!!deleted.deleted_at);

  // 4. Error-case: Deleting again should yield error (if implementation blocks double delete)
  await TestValidator.error("second delete call fails")(
    async () => {
      await api.functional.discussionBoard.categories.eraseById(connection, {
        id: category.id,
      });
    },
  );

  // 5. (Omitted: Cannot check listing exclusion due to missing list/get endpoint)
}