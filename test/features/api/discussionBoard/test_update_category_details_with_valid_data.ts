import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test updating an existing discussion board category with valid data.
 *
 * This scenario verifies that a category can be updated (name and description changes)
 * and that all record changes are correctly persisted, audit timestamps are refreshed, and business
 * constraints (like unique names) are enforced.
 *
 * Steps:
 * 1. Create a category (to ensure a valid id exists for update)
 * 2. Update the category with a new, unique name and description
 * 3. Assert that name/description fields have been updated and the updated_at timestamp changed
 * 4. Attempt to update with a duplicate name and verify uniqueness constraint is enforced
 */
export async function test_api_discussionBoard_test_update_category_details_with_valid_data(
  connection: api.IConnection,
) {
  // Step 1: Create a category for update
  const categoryName = RandomGenerator.alphaNumeric(10);
  const categoryDescription = RandomGenerator.paragraph()(1);
  const category = await api.functional.discussionBoard.categories.post(connection, {
    body: {
      name: categoryName,
      description: categoryDescription
    } satisfies IDiscussionBoardCategory.ICreate,
  });
  typia.assert(category);

  // Step 2: Update created category with new, unique name and description
  const updatedName = RandomGenerator.alphaNumeric(12);
  const updatedDescription = RandomGenerator.paragraph()(1);
  const preUpdateTimestamp = category.updated_at;
  const updated = await api.functional.discussionBoard.categories.putById(connection, {
    id: category.id,
    body: {
      name: updatedName,
      description: updatedDescription
    } satisfies IDiscussionBoardCategory.IUpdate
  });
  typia.assert(updated);
  TestValidator.equals("name updated")(updated.name)(updatedName);
  TestValidator.equals("description updated")(updated.description)(updatedDescription);
  TestValidator.notEquals("updated_at is changed")(updated.updated_at)(preUpdateTimestamp);
  TestValidator.equals("id unchanged")(updated.id)(category.id);

  // Step 3: Validate name uniqueness on update (should fail if reusing an existing name)
  const anotherCategory = await api.functional.discussionBoard.categories.post(connection, {
    body: {
      name: RandomGenerator.alphaNumeric(16),
      description: RandomGenerator.paragraph()(1),
    } satisfies IDiscussionBoardCategory.ICreate,
  });
  typia.assert(anotherCategory);
  await TestValidator.error("cannot update category to duplicate name")(() =>
    api.functional.discussionBoard.categories.putById(connection, {
      id: anotherCategory.id,
      body: {
        name: updatedName,
      }
    })
  );
}