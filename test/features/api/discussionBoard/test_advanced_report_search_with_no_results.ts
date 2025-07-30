import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced report search returns no results with non-matching filters.
 *
 * Business context: Moderators need to ensure the search for reported content
 * reliably reflects filter conditions, including when no records match (e.g.,
 * to confirm staff can safely rely on the dashboard for triage and filtering
 * without false positives). This test ensures that when filters are set that
 * cannot possibly match any real report, the system does not fail or return
 * erroneous data.
 *
 * Test Process:
 *
 * 1. Prepare an advanced report search request with filters guaranteed to match no
 *    reports.
 * 2. Call the moderator reports search endpoint with those filters.
 * 3. Validate the API responds successfully, the data array is empty, and
 *    pagination reflects zero records/pages.
 * 4. Ensure no errors or unexpected properties are returned.
 */
export async function test_api_discussionBoard_test_advanced_report_search_with_no_results(
  connection: api.IConnection,
) {
  // 1. Prepare a filter guaranteed to return zero results (use random UUIDs, rare content type and status)
  const searchFilters: IDiscussionBoardReport.IRequest = {
    reporter_id: typia.random<string & tags.Format<"uuid">>(),
    content_type: "nonexistent-content-type",
    reported_post_id: typia.random<string & tags.Format<"uuid">>(),
    reported_comment_id: typia.random<string & tags.Format<"uuid">>(),
    reason: "reason-that-should-not-exist-in-any-real-report",
    status: "not-a-real-status",
    created_from: "2099-01-01T00:00:00.000Z",
    created_to: "2099-12-31T23:59:59.999Z",
    page: 1,
    limit: 10,
  };

  // 2. Perform advanced search for reports with these non-matching filters
  const response =
    await api.functional.discussionBoard.moderator.reports.search(connection, {
      body: searchFilters,
    });
  typia.assert(response);

  // 3. Validate response fields: empty data array, zero records/pages, correct pagination
  TestValidator.equals("no matching data")(response.data)([]);
  TestValidator.equals("records count")(response.pagination.records)(0);
  TestValidator.equals("pages count")(response.pagination.pages)(0);
  TestValidator.equals("page")(response.pagination.current)(1);
  TestValidator.equals("limit")(response.pagination.limit)(10);
}
