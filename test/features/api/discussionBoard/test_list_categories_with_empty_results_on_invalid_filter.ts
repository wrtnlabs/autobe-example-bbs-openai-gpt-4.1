import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that searching categories with an impossible keyword returns an empty result set and proper pagination.
 *
 * This test ensures robustness of the /discussionBoard/categories search/filter endpoint when given criteria
 * that should match no categories at all. It validates that the API does not throw, the response type is correct,
 * the data array is empty, and pagination metadata remains consistent and meaningful.
 *
 * Steps:
 * 1. Call PATCH /discussionBoard/categories with a highly unlikely keyword in the name field.
 * 2. Assert that the response's `data` array is empty (no categories matched).
 * 3. Assert that the pagination metadata reflects zero records but maintains valid structure (pages ≥ 1, current page within total pages).
 */
export async function test_api_discussionBoard_test_list_categories_with_empty_results_on_invalid_filter(
  connection: api.IConnection,
) {
  // 1. Attempt to search for categories with a name guaranteed not to be found
  const unlikelyFilter = {
    name: "ZZZ__THIS_CATEGORY_SHOULD_NOT_EXIST__UNLIKELY_12345"
  } satisfies IDiscussionBoardCategory.IRequest;

  const output = await api.functional.discussionBoard.categories.patch(connection, {
    body: unlikelyFilter,
  });
  typia.assert(output);

  // 2. Should return no categories
  TestValidator.equals("categories (data) should be empty")(output.data.length)(0);

  // 3. Pagination metadata should reflect empty result but valid pagination
  TestValidator.equals("record count is zero")(output.pagination.records)(0);
  TestValidator.predicate("pages is at least 1")(output.pagination.pages >= 1);
  TestValidator.predicate("current page is valid")(output.pagination.current >= 1 && output.pagination.current <= output.pagination.pages);
}