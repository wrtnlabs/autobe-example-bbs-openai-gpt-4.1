import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate moderator receives a not-found error when attempting to get report
 * details for a non-existent reportId.
 *
 * This test ensures that the moderation report details endpoint properly
 * handles missing or invalid report identifiers. A moderator context is assumed
 * to be present and authorized. The UUID provided will not match any report
 * record in the database (e.g., a random or deleted one).
 *
 * Step-by-step Process:
 *
 * 1. Generate a random UUID (which is not associated with any existing report)
 * 2. Issue a GET request to /discussionBoard/moderator/reports/{reportId} with the
 *    fake UUID
 * 3. Verify that the API responds with an error (typically 404 Not Found or
 *    business error equivalent)
 * 4. Optionally, assert that the error object or thrown exception is of the
 *    expected type.
 */
export async function test_api_discussionBoard_test_get_report_details_as_moderator_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID that is not associated with any report
  const fakeReportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to retrieve the non-existent report (expect failure)
  await TestValidator.error("should throw not-found for invalid reportId")(
    async () => {
      await api.functional.discussionBoard.moderator.reports.at(connection, {
        reportId: fakeReportId,
      });
    },
  );
}
