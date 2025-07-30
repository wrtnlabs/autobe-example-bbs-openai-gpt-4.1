import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validates that the moderator receives an empty report list when there are no
 * reports present in the system.
 *
 * Business Context: Moderators routinely check the discussion board reports
 * dashboard to review new content reports. If there are no reports, the UI and
 * backend must both present an empty result in a standards-compliant,
 * predictable, and error-free manner. Pagination metadata must correctly
 * reflect the fact that there are zero reports and zero pages, and the API must
 * not fail or throw errors in this benign empty-dataset case.
 *
 * Steps:
 *
 * 1. As a moderator, request the paginated list of all discussion board reports
 *    when there are no reports present.
 * 2. Verify that the returned data array is empty and that pagination metadata
 *    accurately reflects an empty result set (records: 0, pages: 0, current
 *    page usually 1, limit as defaulted by backend).
 * 3. Ensure the response structure matches IPageIDiscussionBoardReport.ISummary
 *    and that no unexpected errors or properties are present.
 */
export async function test_api_discussionBoard_test_list_reports_as_moderator_with_no_reports_present(
  connection: api.IConnection,
) {
  // 1. Retrieve the list of discussion board reports as a moderator
  const output =
    await api.functional.discussionBoard.moderator.reports.index(connection);
  typia.assert(output);

  // 2. Validate that the response contains an empty data array
  TestValidator.equals("empty report data")(output.data)([]);

  // 3. Validate pagination meta for empty set
  TestValidator.equals("zero records")(output.pagination.records)(0);
  TestValidator.equals("zero pages")(output.pagination.pages)(0);
  // Usually, current page is 1 and limit is the backend default (often 100)
  TestValidator.equals("current page is 1")(output.pagination.current)(1);
  TestValidator.predicate("limit is positive")(output.pagination.limit > 0);
}
