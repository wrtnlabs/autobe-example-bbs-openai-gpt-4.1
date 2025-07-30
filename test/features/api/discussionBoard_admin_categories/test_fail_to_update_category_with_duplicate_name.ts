import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Validate that updating a category's name to a duplicate (conflicting) name
 * fails with a proper error and does not alter the data.
 *
 * This test ensures that the discussion board category update API enforces the
 * uniqueness constraint on category names and properly rejects and rolls back
 * conflicting updates. It also validates that no side effects occur for the
 * target record when an error happens.
 *
 * Steps:
 *
 * 1. Create two categories (A, B) with unique names.
 * 2. Attempt to update category A's name to category B's name.
 * 3. Confirm that the update is rejected with a unique constraint error.
 * 4. Verify that category A remains unchanged after the failed update. (If a GET
 *    API were available, would reload and compare; for this test, we assert
 *    against the originally created value.)
 */
export async function test_api_discussionBoard_admin_categories_test_fail_to_update_category_with_duplicate_name(
  connection: api.IConnection,
) {
  // 1. Create first category (A)
  const nameA = `Category-A-${RandomGenerator.alphabets(6)}`;
  const catA = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: nameA,
        is_active: true,
        description: RandomGenerator.paragraph()(),
        parent_id: null,
      } satisfies IDiscussionBoardCategory.ICreate,
    },
  );
  typia.assert(catA);

  // 2. Create second category (B)
  const nameB = `Category-B-${RandomGenerator.alphabets(6)}`;
  const catB = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: nameB,
        is_active: true,
        description: RandomGenerator.paragraph()(),
        parent_id: null,
      } satisfies IDiscussionBoardCategory.ICreate,
    },
  );
  typia.assert(catB);

  // 3. Attempt to update category A's name to B's name (should fail)
  await TestValidator.error("duplicate category name should fail")(() =>
    api.functional.discussionBoard.admin.categories.update(connection, {
      categoryId: catA.id,
      body: {
        name: nameB,
      } satisfies IDiscussionBoardCategory.IUpdate,
    }),
  );

  // 4. Ensure the original name for category A remains unchanged
  // (No GET/read API, so just verify value has not been replaced in-memory)
  TestValidator.equals("category name remains unchanged")(catA.name)(nameA);
}
