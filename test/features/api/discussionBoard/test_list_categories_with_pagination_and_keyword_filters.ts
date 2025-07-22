import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test listing and filtering of categories in the discussion board with pagination and keyword filters.
 *
 * This test verifies that the PATCH /discussionBoard/categories endpoint correctly implements paginated, filtered, and keyword search logic for admin and public usage scenarios.
 *
 * Steps:
 * 1. Create multiple categories with distinct names and descriptions for reliable search and pagination.
 * 2. Query paginated lists without filters, and confirm correct page/total/count navigation metadata and expected categories.
 * 3. Search with name keyword, confirming only matches are returned and are a subset of items created.
 * 4. Test creation date filtering to retrieve categories created after a known point. Confirm correct set is included.
 * 5. Test pagination: request a subset of the total, check correct number of categories are returned with navigation data accurate.
 * 6. Edge case: Provide an out-of-bounds page number; expect an empty list but valid pagination meta.
 *
 * If API functions for deletion or role switch were available, the test
 * could validate soft delete behavior and permission differences, but these
 * are omitted as unimplementable here.
 */
export async function test_api_discussionBoard_test_list_categories_with_pagination_and_keyword_filters(
  connection: api.IConnection,
) {
  // Step 1: Create categories for test coverage
  const createdCategories: IDiscussionBoardCategory[] = [];
  for (let i = 0; i < 5; ++i) {
    const category = await api.functional.discussionBoard.categories.post(
      connection,
      {
        body: {
          name: `Economics_${i}_${RandomGenerator.alphabets(6)}`,
          description: `Category ${i} description: ${RandomGenerator.alphabets(12)}`,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
    typia.assert(category);
    createdCategories.push(category);
  }

  // Step 2: List all categories with default pagination
  const listAll = await api.functional.discussionBoard.categories.patch(connection, {
    body: {},
  });
  typia.assert(listAll);
  TestValidator.predicate("all created categories included")(
    createdCategories.every((cat) => listAll.data.some((item) => item.id === cat.id))
  );

  // Step 3: Search by keyword
  const keywordCategory = createdCategories[2];
  const byKeyword = await api.functional.discussionBoard.categories.patch(connection, {
    body: { name: keywordCategory.name },
  });
  typia.assert(byKeyword);
  TestValidator.predicate("keyword search yields correct match")(
    byKeyword.data.length === 1 && byKeyword.data[0].id === keywordCategory.id
  );

  // Step 4: Creation date range filter
  const from = createdCategories[1].created_at;
  const byDate = await api.functional.discussionBoard.categories.patch(connection, {
    body: { created_from: from },
  });
  typia.assert(byDate);
  TestValidator.predicate("all returned are new enough")(
    byDate.data.every((cat) => cat.created_at >= from)
  );

  // Step 5: Pagination (limit=2)
  const paginated = await api.functional.discussionBoard.categories.patch(connection, {
    body: { limit: 2, page: 1 },
  });
  typia.assert(paginated);
  TestValidator.equals("page 1 size")(paginated.data.length)(2);
  TestValidator.equals("pagination meta: page 1")(
    paginated.pagination.current
  )(1);

  // Step 6: Out-of-bounds page test
  const outOfBounds = await api.functional.discussionBoard.categories.patch(connection, {
    body: { limit: 2, page: 100 },
  });
  typia.assert(outOfBounds);
  TestValidator.equals("no results on out-of-bounds page")(outOfBounds.data.length)(0);
  TestValidator.equals("pagination meta: current matches")(
    outOfBounds.pagination.current
  )(100);
}