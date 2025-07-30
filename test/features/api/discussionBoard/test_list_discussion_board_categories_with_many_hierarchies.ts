import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Validate list and hierarchical structure of discussion board categories with
 * deep nesting.
 *
 * This test confirms that the GET /discussionBoard/categories endpoint returns
 * a flat list of all categories, including deeply nested structures, and that
 * parent_id relations are consistently and correctly reflected.
 *
 * Test steps:
 *
 * 1. As admin, create several categories:
 *
 * - At least two root categories (no parent_id)
 * - Multiple child categories with parent_id referencing root categories
 * - One or more third-level (nested) categories, referencing a child as parent
 *
 * 2. Call GET /discussionBoard/categories
 * 3. Validate that:
 *
 * - All created categories are present in the data array
 * - Each child has the correct parent_id
 * - All root categories have parent_id null
 * - All third-level (or deeper) categories have parent_id referencing an
 *   appropriate (existing) second-level category
 * - The returned array is flat (i.e., not a nested data structure)
 *
 * Edge cases: If time permits, test with an inactive category, or categories
 * with missing intermediate parent (should not happen via normal UI but is
 * possible via direct post).
 */
export async function test_api_discussionBoard_test_list_discussion_board_categories_with_many_hierarchies(
  connection: api.IConnection,
) {
  // 1. Create root categories
  const root1 = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph()(3),
        is_active: true,
        parent_id: null,
      },
    },
  );
  typia.assert(root1);

  const root2 = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph()(4),
        is_active: true,
        parent_id: null,
      },
    },
  );
  typia.assert(root2);

  // 2. Create child categories (under root1 and root2)
  const child1 = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph()(5),
        is_active: true,
        parent_id: root1.id,
      },
    },
  );
  typia.assert(child1);

  const child2 = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph()(6),
        is_active: true,
        parent_id: root2.id,
      },
    },
  );
  typia.assert(child2);

  // 3. Create a third-level category (child of child1)
  const grandchild =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph()(7),
        is_active: true,
        parent_id: child1.id,
      },
    });
  typia.assert(grandchild);

  // 4. Fetch all categories
  const res = await api.functional.discussionBoard.categories.index(connection);
  typia.assert(res);

  // 5. Validate presence and parent-child relationship integrity
  const all = res.data;
  const findById = (id: string) => all.find((cat) => cat.id === id);

  TestValidator.predicate("Root 1 present")(!!findById(root1.id));
  TestValidator.predicate("Root 2 present")(!!findById(root2.id));
  TestValidator.predicate("Child 1 present")(!!findById(child1.id));
  TestValidator.predicate("Child 2 present")(!!findById(child2.id));
  TestValidator.predicate("Grandchild present")(!!findById(grandchild.id));

  TestValidator.equals("Root 1 is top-level")(findById(root1.id)?.parent_id)(
    null,
  );
  TestValidator.equals("Root 2 is top-level")(findById(root2.id)?.parent_id)(
    null,
  );
  TestValidator.equals("Child 1 parent is Root 1")(
    findById(child1.id)?.parent_id,
  )(root1.id);
  TestValidator.equals("Child 2 parent is Root 2")(
    findById(child2.id)?.parent_id,
  )(root2.id);
  TestValidator.equals("Grandchild parent is Child 1")(
    findById(grandchild.id)?.parent_id,
  )(child1.id);
  // 6. Confirm flat array structure (not nested arrays)
  TestValidator.predicate("Flat data array - none are arrays")(
    all.every((cat) => !Array.isArray(cat)),
  );
}
