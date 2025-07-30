import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import type { IPageIDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * [Advanced Settings Search with No Match]
 *
 * This test validates that the admin's advanced discussion board settings
 * search endpoint correctly returns an empty result list and accurate
 * pagination information when filters guarantee no database records are
 * matched.
 *
 * This ensures API consumers (like admin UI) can reliably distinguish between
 * data absence by filter and system errors.
 *
 * [Test Steps]
 *
 * 1. Prepopulate: Create at least one discussion board setting using the admin
 *    settings create endpoint. This ensures the settings table is not empty and
 *    negative filters are meaningful.
 * 2. Perform a negative search (PATCH /discussionBoard/admin/settings) with a
 *    non-existent setting_key substring that is guaranteed not to match the
 *    added record.
 * 3. Confirm the result data array is empty, and pagination meta reflects zero
 *    records/pages with the requested page and limit.
 * 4. Repeat with an extreme date range that is guaranteed to exclude all actual
 *    records (e.g., far in the past).
 * 5. Validate type safety and logical correctness throughout.
 */
export async function test_api_discussionBoard_test_advanced_search_settings_with_no_match_returns_empty(
  connection: api.IConnection,
) {
  // 1. Prepopulate: Ensure at least one setting exists
  const dummyKey = `unit-test-setting-key-${RandomGenerator.alphaNumeric(16)}`;
  const created = await api.functional.discussionBoard.admin.settings.create(
    connection,
    {
      body: {
        setting_key: dummyKey,
        setting_value: RandomGenerator.alphabets(16),
        description: "Unit test dummy setting for negative search scenario.",
      } satisfies IDiscussionBoardSetting.ICreate,
    },
  );
  typia.assert(created);

  // 2. Negative search: Non-existent setting_key substring
  const randomSubstr = `nohit-${RandomGenerator.alphaNumeric(15)}`;
  const searchResult1 =
    await api.functional.discussionBoard.admin.settings.search(connection, {
      body: {
        setting_key: randomSubstr,
        page: 1,
        limit: 7,
      } satisfies IDiscussionBoardSetting.IRequest,
    });
  typia.assert(searchResult1);
  TestValidator.equals("Empty data for non-existent setting_key")(
    searchResult1.data,
  )([]);
  TestValidator.equals("Pagination: zero records")(
    searchResult1.pagination.records,
  )(0);
  TestValidator.equals("Pagination: zero pages")(
    searchResult1.pagination.pages,
  )(0);
  TestValidator.equals("Pagination: current page matches")(
    searchResult1.pagination.current,
  )(1);
  TestValidator.equals("Pagination: limit matches")(
    searchResult1.pagination.limit,
  )(7);

  // 3. Negative search: Extreme date range
  const farPast = "1899-01-01T00:00:00.000Z";
  const farPastEnd = "1899-12-31T23:59:59.999Z";
  const searchResult2 =
    await api.functional.discussionBoard.admin.settings.search(connection, {
      body: {
        created_at_start: farPast,
        created_at_end: farPastEnd,
        page: 4,
        limit: 3,
      } satisfies IDiscussionBoardSetting.IRequest,
    });
  typia.assert(searchResult2);
  TestValidator.equals("Empty data for extreme date filter")(
    searchResult2.data,
  )([]);
  TestValidator.equals("Pagination: zero records")(
    searchResult2.pagination.records,
  )(0);
  TestValidator.equals("Pagination: zero pages")(
    searchResult2.pagination.pages,
  )(0);
  TestValidator.equals("Pagination: current page matches")(
    searchResult2.pagination.current,
  )(4);
  TestValidator.equals("Pagination: limit matches")(
    searchResult2.pagination.limit,
  )(3);
}
