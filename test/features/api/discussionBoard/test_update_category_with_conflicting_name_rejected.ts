import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test updating a category's name to one that conflicts with another
 * existing category.
 *
 * The test ensures that the server enforces name uniqueness for
 * Discussion Board Categories even during update operations. It executes
 * the following workflow:
 *
 * 1. Create the first category with a distinct, random name (A).
 * 2. Create a second category with another distinct name (B).
 * 3. Attempt to update the second category, setting its name to the first
 *    (A's) name, deliberately creating a name conflict.
 * 4. The server should reject the operation with a validation or conflict
 *    error, upholding the uniqueness constraint.
 */
export async function test_api_discussionBoard_test_update_category_with_conflicting_name_rejected(
  connection: api.IConnection,
) {
  // 1. Create the first category (target of name conflict)
  const nameA = RandomGenerator.alphabets(12);
  const categoryA = await api.functional.discussionBoard.categories.post(connection, {
    body: { name: nameA, description: RandomGenerator.paragraph()() } satisfies IDiscussionBoardCategory.ICreate,
  });
  typia.assert(categoryA);

  // 2. Create a second category (to be renamed)
  const nameB = RandomGenerator.alphabets(12);
  const categoryB = await api.functional.discussionBoard.categories.post(connection, {
    body: { name: nameB, description: RandomGenerator.paragraph()() } satisfies IDiscussionBoardCategory.ICreate,
  });
  typia.assert(categoryB);
  TestValidator.notEquals("names must differ initially")(categoryA.name)(categoryB.name);

  // 3. Attempt to update categoryB, setting its name to A (conflict)
  await TestValidator.error("category name conflict on update")(
    async () => {
      await api.functional.discussionBoard.categories.putById(connection, {
        id: categoryB.id,
        body: { name: categoryA.name } satisfies IDiscussionBoardCategory.IUpdate,
      });
    },
  );
}