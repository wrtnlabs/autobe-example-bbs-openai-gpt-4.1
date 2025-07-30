import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate admin retrieval of discussion board reports list when system has no
 * reports.
 *
 * This test ensures that when an admin fetches the reports list and there are
 * no reports in the system:
 *
 * - The API returns an empty array for `data` in the result
 * - The `pagination.records` value is 0
 * - The pagination metadata is valid and represents an empty result set
 * - The response structure matches the expected type
 *
 * Steps:
 *
 * 1. As admin, call the GET /discussionBoard/admin/reports endpoint.
 * 2. Validate the response is an IPageIDiscussionBoardReport.ISummary object with
 *    an empty data array.
 * 3. Assert pagination.records is 0, pages is 0, and current page/limit are valid
 *    numbers.
 * 4. Ensure no errors are thrown and typings remain correct.
 */
export async function test_api_discussionBoard_admin_reports_test_list_reports_as_admin_with_no_reports(
  connection: api.IConnection,
) {
  // 1. Admin fetches reports list
  const result =
    await api.functional.discussionBoard.admin.reports.index(connection);
  typia.assert(result);

  // 2. Validate that the returned data array is empty
  TestValidator.equals("reports list is empty")(result.data.length)(0);
  TestValidator.equals("reports data array")(result.data)([]);

  // 3. Check pagination metadata
  TestValidator.equals("pagination.records is zero")(result.pagination.records)(
    0,
  );
  TestValidator.equals("pagination.pages is zero")(result.pagination.pages)(0);
  TestValidator.predicate("pagination.current is a positive int")(
    typeof result.pagination.current === "number" &&
      result.pagination.current > 0,
  );
  TestValidator.predicate("pagination.limit is a positive int")(
    typeof result.pagination.limit === "number" && result.pagination.limit > 0,
  );
}
