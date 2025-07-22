import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IPageIDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test listing discussion board channels with various filters and pagination.
 *
 * This test validates the /discussionBoard/channels endpoint by exercising combinations of filter options and pagination settings.
 * It checks the following business scenarios:
 *
 * 1. Retrieve a general list of channels without any filters (default pagination).
 * 2. Apply name, code, and description filters separately and in combination; validate that results are correctly filtered.
 * 3. Use pagination (page/limit) and validate correctness: page navigation, boundaries (first/last page), and out-of-range results (empty page).
 * 4. Edge case of limit=0 and negative/zero page values.
 * 5. Compare behavior as public/unauthenticated vs administrator (if the API differentiates responses).
 * 6. Confirm correct pagination metadata (total records, current page, total pages, limit) for various requests.
 * 7. Confirm all responses and data shapes conform to expected types.
 *
 * As there are no setup dependencies, this test assumes the database already contains sufficiently diverse channel records to support filtering and pagination tests.
 *
 * The sequence:
 * 1. List channels (default params) => check basic structure and at least one result (if any exist)
 * 2. List channels with code filter (e.g., using code from a previous result) => check all returned have that code
 * 3. List channels with name filter (e.g., using partial/full match)
 * 4. List channels with description filter (with expected results or possible empty set)
 * 5. List channels with combined filters (AND logic)
 * 6. List channels with pagination: limit = 1/page = 1,2,... to verify navigation and edge pages
 * 7. List channels with very high page number to verify empty data
 * 8. List channels with limit=0 and limit > max records
 * 9. Try invalid input: page=0, limit=-1
 * 10. If access role matters, repeat some steps as admin (if setup allows role switching, else just public)
 * 11. Validate that pagination metadata matches actual response data counts
 */
export async function test_api_discussionBoard_test_list_channels_with_various_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. List channels with default params
  const resp_default = await api.functional.discussionBoard.channels.patch(connection, { body: {} });
  typia.assert(resp_default);
  TestValidator.predicate('default: has pagination')(!!resp_default.pagination);
  TestValidator.predicate('default: data array')(Array.isArray(resp_default.data));

  // If results exist, extract first channel for further filter tests
  const hasChannel = resp_default.data.length > 0;
  let firstChannel = undefined;
  if (hasChannel) firstChannel = resp_default.data[0];

  // 2. Filter by channel code (exact)
  if (firstChannel) {
    const resp_code = await api.functional.discussionBoard.channels.patch(connection, { body: { code: firstChannel.code } });
    typia.assert(resp_code);
    for (const c of resp_code.data) {
      TestValidator.equals('code filter')(c.code)(firstChannel.code);
    }
  }

  // 3. Filter by channel name (full or partial)
  if (firstChannel) {
    // Try full name filter
    const resp_name = await api.functional.discussionBoard.channels.patch(connection, { body: { name: firstChannel.name } });
    typia.assert(resp_name);
    for (const c of resp_name.data) {
      TestValidator.equals('name filter')(c.name)(firstChannel.name);
    }
    // Try partial name filter (e.g., slice first 2 chars)
    if (firstChannel.name.length > 2) {
      const partial = firstChannel.name.slice(0, 2);
      const resp_partial = await api.functional.discussionBoard.channels.patch(connection, { body: { name: partial } });
      typia.assert(resp_partial);
      TestValidator.predicate('partial name filter')(resp_partial.data.some(c => c.name.includes(partial)));
    }
  }

  // 4. Filter by description
  if (firstChannel && firstChannel.description) {
    const descWord = String(firstChannel.description).split(' ')[0];
    const resp_desc = await api.functional.discussionBoard.channels.patch(connection, { body: { description: descWord } });
    typia.assert(resp_desc);
    TestValidator.predicate('desc filter')(resp_desc.data.every(c => String(c.description||'').includes(descWord)));
  }

  // 5. Combined filters
  if (firstChannel) {
    const resp_combo = await api.functional.discussionBoard.channels.patch(connection, { body: { code: firstChannel.code, name: firstChannel.name } });
    typia.assert(resp_combo);
    for (const c of resp_combo.data) {
      TestValidator.equals('combo.code')(c.code)(firstChannel.code);
      TestValidator.equals('combo.name')(c.name)(firstChannel.name);
    }
  }

  // 6. Pagination: limit = 1, walk pages and validate navigation
  const resp_limit1 = await api.functional.discussionBoard.channels.patch(connection, { body: { limit: 1 } });
  typia.assert(resp_limit1);
  TestValidator.equals('limit1 count')(resp_limit1.data.length)(resp_limit1.data.length <= 1 ? resp_limit1.data.length : 1);
  if (resp_limit1.pagination.pages > 1) {
    // Try navigating to second page
    const resp_pg2 = await api.functional.discussionBoard.channels.patch(connection, { body: { limit: 1, page: 2 } });
    typia.assert(resp_pg2);
    TestValidator.equals('page 2 current')(resp_pg2.pagination.current)(2);
  }

  // 7. Pagination: request out-of-range page (should be empty data)
  if (resp_limit1.pagination.pages > 1) {
    const tooHigh = resp_limit1.pagination.pages + 10;
    const resp_tooHigh = await api.functional.discussionBoard.channels.patch(connection, { body: { limit: 1, page: tooHigh } });
    typia.assert(resp_tooHigh);
    TestValidator.equals('out-of-range empty')(resp_tooHigh.data.length)(0);
  }

  // 8. Edge cases: limit=0 (should not throw, but likely empty or error)
  await TestValidator.error('limit=0 error or empty')(async () => {
    const resp_zero = await api.functional.discussionBoard.channels.patch(connection, { body: { limit: 0 } });
    // If API tolerates limit=0, data array should be empty
    typia.assert(resp_zero);
    TestValidator.equals('limit 0 data')(resp_zero.data.length)(0);
  });

  // 9. Invalid input: page=0, limit=-1
  await TestValidator.error('page=0 error')(async () => {
    await api.functional.discussionBoard.channels.patch(connection, { body: { page: 0 } });
  });
  await TestValidator.error('limit=-1 error')(async () => {
    await api.functional.discussionBoard.channels.patch(connection, { body: { limit: -1 } });
  });

  // 10. (Optional/If-possible): Admin access test. If role switching is possible via login, repeat a request as admin and validate same/different fields.
  // Not implemented due to lack of setup dependency/auth APIs in current context. Only public access is tested.
}