import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that the admin search for reports with filters yielding no matching
 * results returns the correct paging structure with an empty data array.
 *
 * This test ensures that when an admin uses the advanced report search endpoint
 * with filter parameters that are highly unlikely (such as random UUIDs,
 * obscure status, or future date ranges), the API should not raise errors and
 * must return a valid IPageIDiscussionBoardReport.ISummary object. The returned
 * object must have an empty data array and paging info that reflects zero
 * records and pages. No exceptions or errors are expected in this scenario.
 *
 * Steps:
 *
 * 1. Construct a search request using rare filter values (e.g., unknown UUIDs,
 *    bogus status value, out-of-range dates).
 * 2. Admin calls PATCH /discussionBoard/admin/reports with these filters.
 * 3. Validate: response has data = [] (empty array), pagination.records = 0,
 *    pagination.pages = 0 or 1, and correct structure.
 * 4. Ensure no error is raised and response matches expected type.
 */
export async function test_api_discussionBoard_test_admin_report_search_with_no_matching_results(
  connection: api.IConnection,
) {
  // 1. Construct no-match filter request: UUID not present & rare status
  const filter: IDiscussionBoardReport.IRequest = {
    reporter_id: typia.random<string & tags.Format<"uuid">>(),
    content_type: "post",
    reported_post_id: typia.random<string & tags.Format<"uuid">>(),
    reported_comment_id: typia.random<string & tags.Format<"uuid">>(),
    reason: "reason-that-does-not-exist",
    status: "nonexistent-status",
    created_from: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 365,
    ).toISOString(), // Far future
    created_to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 366).toISOString(), // Farther future
    page: 1,
    limit: 10,
  };

  // 2. Admin calls report search endpoint with these filters
  const output = await api.functional.discussionBoard.admin.reports.search(
    connection,
    {
      body: filter,
    },
  );
  typia.assert(output);

  // 3. Assert the response structure: data must be empty, pagination correct
  TestValidator.equals("empty report results")(output.data)([]);
  TestValidator.equals("no records")(output.pagination.records)(0);
  TestValidator.predicate("0 or 1 pages for empty result")(
    output.pagination.pages === 0 || output.pagination.pages === 1,
  );
  TestValidator.equals("current page matches")(output.pagination.current)(1);
  TestValidator.equals("limit matches")(output.pagination.limit)(10);
}
