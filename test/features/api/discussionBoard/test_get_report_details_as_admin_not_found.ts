import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test not-found error when retrieving a discussion board report as admin with
 * an invalid or non-existent reportId.
 *
 * This test ensures that the API returns a proper not-found error (e.g., 404)
 * when an admin attempts to fetch the details of a content report using a UUID
 * that does not correspond to any existing report. This validates the report
 * retrieval error handling for the admin moderation workflow.
 *
 * Workflow:
 *
 * 1. Generate a random UUID that is exceedingly unlikely to exist in the system as
 *    a reportId.
 * 2. As an admin, issue a GET request for
 *    /discussionBoard/admin/reports/{reportId} using this bogus ID.
 * 3. Assert that the system returns a not-found error response (typically 404),
 *    confirming appropriate handling of the missing resource case.
 */
export async function test_api_discussionBoard_test_get_report_details_as_admin_not_found(
  connection: api.IConnection,
) {
  // Step 1: Generate a random (bogus) reportId (UUID)
  const bogusReportId: string = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Attempt to GET the report as admin -- expect an error
  await TestValidator.error("should return not-found error")(async () => {
    await api.functional.discussionBoard.admin.reports.at(connection, {
      reportId: bogusReportId,
    });
  });
}
