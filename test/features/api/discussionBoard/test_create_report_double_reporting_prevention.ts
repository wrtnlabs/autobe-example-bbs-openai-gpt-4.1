import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate prevention of double-reporting the same content by the same member
 * in discussion board.
 *
 * Business logic: A member must not be allowed to submit more than one report
 * on the same target post or comment. This test ensures that after a report is
 * created, a duplicate report attempt returns an error.
 *
 * Test Steps:
 *
 * 1. Generate a new member ID (UUID)
 * 2. Generate a target post ID (UUID)
 * 3. Create a report for the given target post by the generated member
 * 4. Assert that first report creation is successful
 * 5. Attempt to create a second report with the same reporter_id and target post
 *    ID
 * 6. Assert that an error is thrown for duplicate report
 */
export async function test_api_discussionBoard_test_create_report_double_reporting_prevention(
  connection: api.IConnection,
) {
  // Step 1: Generate a member ID (simulate member identity)
  const reporterId: string = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Generate a target post ID (simulate post)
  const reportedPostId: string = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create the first report
  const createBody: IDiscussionBoardReport.ICreate = {
    reporter_id: reporterId,
    content_type: "post",
    reported_post_id: reportedPostId,
    reported_comment_id: null,
    reason: "Inappropriate content in post.",
  };
  const firstReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: createBody,
    });
  typia.assert(firstReport);
  TestValidator.equals("first report: reporter ID")(firstReport.reporter_id)(
    reporterId,
  );
  TestValidator.equals("first report: post ID")(firstReport.reported_post_id)(
    reportedPostId,
  );

  // Step 4: Attempt to create second (duplicate) report
  await TestValidator.error("Duplicate report on same content must be blocked")(
    async () => {
      await api.functional.discussionBoard.member.reports.create(connection, {
        body: createBody,
      });
    },
  );
}
