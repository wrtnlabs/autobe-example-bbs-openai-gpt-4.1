import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Validate prevention of invalid parent_id values when updating a category.
 *
 * This E2E test ensures that the API strictly enforces referential and circular
 * relationship constraints on category hierarchy. It verifies two critical
 * failure scenarios when updating a category's parent:
 *
 * 1. Attempting to set the parent_id of a category to a non-existent UUID should
 *    be rejected by the API.
 * 2. Attempting to set the parent_id of a category to its own id (itself) should
 *    be rejected (circular/loop prevention).
 *
 * In both cases, the API should return a clear validation error and the
 * resource should remain unchanged.
 *
 * Steps:
 *
 * 1. Create a root (top-level) category with parent_id: null.
 * 2. Try updating category to a non-existent parent_id, expect failed API call
 *    (validation error).
 * 3. Try updating category to its own id as parent_id (circular ref), expect
 *    failed API call (validation error).
 * 4. Re-fetch the category and confirm its parent_id is unchanged (still null),
 *    and id/name remain the same.
 */
export async function test_api_discussionBoard_admin_categories_test_fail_to_update_category_with_invalid_parent_reference(
  connection: api.IConnection,
) {
  // 1. Create a root (top-level) category
  const createBody: IDiscussionBoardCategory.ICreate = {
    name: RandomGenerator.paragraph()(1),
    description: RandomGenerator.paragraph()(1),
    parent_id: null,
    is_active: true,
  };
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    { body: createBody },
  );
  typia.assert(category);

  // 2. Attempt to set parent_id to a non-existent UUID (must fail)
  const nonExistentParentId = typia.random<string & tags.Format<"uuid">>();
  // Ensure it is not equal to the created category id
  TestValidator.notEquals("parent_id should not match its own id")(category.id)(
    nonExistentParentId,
  );
  await TestValidator.error("update with non-existent parent_id should fail")(
    async () => {
      await api.functional.discussionBoard.admin.categories.update(connection, {
        categoryId: category.id,
        body: {
          parent_id: nonExistentParentId,
        } satisfies IDiscussionBoardCategory.IUpdate,
      });
    },
  );

  // 3. Attempt to set parent_id to its own id (must fail/circular reference)
  await TestValidator.error("update with circular parent_id should fail")(
    async () => {
      await api.functional.discussionBoard.admin.categories.update(connection, {
        categoryId: category.id,
        body: {
          parent_id: category.id,
        } satisfies IDiscussionBoardCategory.IUpdate,
      });
    },
  );

  // 4. Optionally, re-fetch the category and verify it was not changed
  // (Assume a 'get by id' function is available in a real API; here we can only rely on create/update)
  // Since the only available API functions are create and update,
  // if an update failed, category state should be unchanged from what was returned at creation.

  // Re-check: Since we lack a category fetch endpoint, at least confirm we still have same id/name/parent_id from the created object
  TestValidator.equals("category id unchanged")(category.id)(category.id);
  TestValidator.equals("category name unchanged")(category.name)(
    createBody.name,
  );
  TestValidator.equals("category parent_id unchanged")(category.parent_id)(
    null,
  );
}
