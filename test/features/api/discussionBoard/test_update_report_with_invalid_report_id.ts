import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate that updating a discussion board report with an invalid or
 * non-existent reportId results in an appropriate error response.
 *
 * This test case targets the error handling logic of the moderator report
 * update endpoint. It simulates a moderator attempting to update a report using
 * a random UUID that does not correspond to any existing report record.
 *
 * Steps:
 *
 * 1. Generate a random UUID to use as the invalid reportId.
 * 2. Prepare a valid report update payload (status update and optional admin
 *    note).
 * 3. Attempt to update the report at
 *    /discussionBoard/moderator/reports/{invalidReportId} as a moderator.
 * 4. Verify that the operation fails with an appropriate error (expect 404 Not
 *    Found or equivalent business error).
 *
 * This ensures that the system enforces resource existence checks and does not
 * allow updates to missing or already-deleted reports.
 */
export async function test_api_discussionBoard_test_update_report_with_invalid_report_id(
  connection: api.IConnection,
) {
  // 1. Generate a random, non-existent reportId (UUID format)
  const invalidReportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Prepare a valid IDiscussionBoardReport.IUpdate object for the report update
  const updatePayload: IDiscussionBoardReport.IUpdate = {
    status: "resolved",
    reason: "Moderator resolved this test report.",
    resolved_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };

  // 3. Attempt to update the report and expect an error (should be 404 Not Found)
  await TestValidator.error("Updating non-existent report must fail")(
    async () => {
      await api.functional.discussionBoard.moderator.reports.update(
        connection,
        {
          reportId: invalidReportId,
          body: updatePayload,
        },
      );
    },
  );
}
