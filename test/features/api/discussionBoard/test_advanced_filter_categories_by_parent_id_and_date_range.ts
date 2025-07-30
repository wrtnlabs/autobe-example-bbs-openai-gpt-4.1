import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Advanced filtering of discussion board categories by parent_id and date
 * range.
 *
 * This test verifies that the discussion board category filtering endpoint
 * correctly returns categories filtered by a specific parent_id and
 * created_at/updated_at date ranges, and that pagination and sorting (by
 * created_at) work as expected. The business requirement is to allow
 * administrators or users to efficiently filter nested category lists and
 * verify results against known data and time windows.
 *
 * Workflow:
 *
 * 1. Create a root category (parent, with no parent_id)
 * 2. Create 3 child categories under the root, with distinct created_at and
 *    updated_at timestamps.
 *
 *    - For simulation, assign timestamps that are at least one minute apart (can use
 *         mock time or wait as needed)
 * 3. (Optional) Create another unrelated root category and child, to ensure
 *    unrelated categories don't appear in filtered results.
 * 4. Use the PATCH /discussionBoard/categories endpoint to search by the known
 *    root's id as parent_id and a date range that includes only a subset of the
 *    children.
 * 5. Validate that only the expected children are returned (by id/name), no
 *    unrelated categories are present, and that pagination/info matches
 *    expected numbers.
 * 6. Run further searches with narrower date ranges and/or sort reverse order, to
 *    verify sorting and pagination as well.
 *
 * Focus on end-to-end workflow and result validation, not internal DB state.
 */
export async function test_api_discussionBoard_test_advanced_filter_categories_by_parent_id_and_date_range(
  connection: api.IConnection,
) {
  // 1. Create a root category
  const rootName = `root-${RandomGenerator.alphabets(5)}`;
  const rootCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: rootName,
        is_active: true,
        description: "Test root category",
        parent_id: null,
      },
    });
  typia.assert(rootCategory);

  // 2. Sequentially create three child categories with distinct timestamps
  const childCategories: IDiscussionBoardCategory[] = [];
  for (let i = 0; i < 3; ++i) {
    // Wait 1100ms to ensure created_at will differ
    if (i > 0) await new Promise((res) => setTimeout(res, 1100));
    const child = await api.functional.discussionBoard.admin.categories.create(
      connection,
      {
        body: {
          name: `child${i + 1}-${RandomGenerator.alphabets(4)}`,
          is_active: true,
          description: `Child category ${i + 1}`,
          parent_id: rootCategory.id,
        },
      },
    );
    typia.assert(child);
    childCategories.push(child);
  }

  // 3. Optionally, create another root and child to confirm filtered isolation
  const otherRoot =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: `otherRoot-${RandomGenerator.alphabets(5)}`,
        is_active: true,
        description: "Noise root",
        parent_id: null,
      },
    });
  typia.assert(otherRoot);
  const unrelatedChild =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: `unrelated-${RandomGenerator.alphabets(5)}`,
        is_active: true,
        description: "Noise child",
        parent_id: otherRoot.id,
      },
    });
  typia.assert(unrelatedChild);

  // 4. Find date range that selects only childCategories[1] and childCategories[2]
  const start = childCategories[1].created_at;
  const end = childCategories[2].created_at;

  // 5. Query categories using parent_id filter and created_at date window
  const filtered = await api.functional.discussionBoard.categories.search(
    connection,
    {
      body: {
        parent_id: rootCategory.id,
        created_at_start: start,
        created_at_end: end,
        sort: "created_at",
        order: "asc",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(filtered);
  // Only categories 2 and 3 should be returned in order
  TestValidator.equals("category count")(filtered.data.length)(2);
  TestValidator.equals("category order")(filtered.data[0].id)(
    childCategories[1].id,
  );
  TestValidator.equals("category order")(filtered.data[1].id)(
    childCategories[2].id,
  );

  // 6. Now check reverse order and that pagination metadata reflects expected numbers
  const filteredDesc = await api.functional.discussionBoard.categories.search(
    connection,
    {
      body: {
        parent_id: rootCategory.id,
        created_at_start: start,
        created_at_end: end,
        sort: "created_at",
        order: "desc",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(filteredDesc);
  TestValidator.equals("descending order")(filteredDesc.data[0].id)(
    childCategories[2].id,
  );
  TestValidator.equals("descending order")(filteredDesc.data[1].id)(
    childCategories[1].id,
  );

  // 7. Ensure that unrelated category is not present in any result
  for (const result of [filtered, filteredDesc]) {
    for (const item of result.data) {
      if (item.id === unrelatedChild.id)
        throw new Error("Unrelated category included in filtered result");
    }
  }

  // 8. (Edge case) Filter for a date range outside all children's created_at: should return empty
  const emptyFilter = await api.functional.discussionBoard.categories.search(
    connection,
    {
      body: {
        parent_id: rootCategory.id,
        created_at_start: unrelatedChild.created_at,
        created_at_end: unrelatedChild.created_at,
        sort: "created_at",
        order: "asc",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(emptyFilter);
  TestValidator.equals("empty result")(emptyFilter.data.length)(0);
}
