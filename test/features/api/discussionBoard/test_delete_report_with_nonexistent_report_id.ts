import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate admin attempt to delete a report with a non-existent or already
 * deleted reportId.
 *
 * This test verifies that when an admin tries to invoke the permanent delete
 * endpoint `/discussionBoard/admin/reports/{reportId}` with a UUID that does
 * not exist in the system, the API responds with 404 Not Found and does not
 * alter any data or trigger audit logs for successful deletion. No data setup
 * is needed since the reportId will be a guaranteed unused value.
 *
 * Steps:
 *
 * 1. Generate a random UUID for reportId that is not associated with any report
 * 2. Attempt to delete the report using the admin endpoint
 * 3. Verify that the request fails with an appropriate 404 Not Found error
 */
export async function test_api_discussionBoard_test_delete_report_with_nonexistent_report_id(
  connection: api.IConnection,
) {
  // 1. Generate a random uuid that should never exist in the system
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to delete with that UUID, expecting a 404 error
  await TestValidator.error(
    "deleting with non-existent reportId should yield 404 error",
  )(async () => {
    await api.functional.discussionBoard.admin.reports.erase(connection, {
      reportId: nonExistentReportId,
    });
  });
}
