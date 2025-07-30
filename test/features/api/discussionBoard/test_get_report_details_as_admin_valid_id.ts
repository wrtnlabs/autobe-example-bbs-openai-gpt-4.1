import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate retrieval of a detailed content report as an admin using a valid
 * reportId.
 *
 * Business context:
 *
 * - Members can file moderation reports against posts or comments in the
 *   discussion board.
 * - Admins are authorized to retrieve reports with all details, including
 *   sensitive/metadata fields.
 *
 * Test steps:
 *
 * 1. As a member, create a new moderation report for either a post or comment
 *    (simulate with random but valid fields).
 * 2. Extract the generated reportId from creation response.
 * 3. As an admin (simulate context or assume connection has admin role), retrieve
 *    the report details by reportId using the admin API.
 * 4. Assert that the returned report contains all expected fields, is type-safe,
 *    and metadata (such as reporter_id, created_at, etc) are present and
 *    correct.
 * 5. Optionally, check that sensitive metadata only visible as admin (such as
 *    reporter_id, status) is included.
 */
export async function test_api_discussionBoard_test_get_report_details_as_admin_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a new content report as a member
  const reportCreateInput: IDiscussionBoardReport.ICreate = {
    reporter_id: typia.random<string & tags.Format<"uuid">>(),
    content_type: RandomGenerator.pick(["post", "comment"]),
    reason: RandomGenerator.paragraph()(),
  };
  if (reportCreateInput.content_type === "post") {
    reportCreateInput.reported_post_id = typia.random<
      string & tags.Format<"uuid">
    >();
    reportCreateInput.reported_comment_id = null;
  } else {
    reportCreateInput.reported_post_id = null;
    reportCreateInput.reported_comment_id = typia.random<
      string & tags.Format<"uuid">
    >();
  }
  const createdReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportCreateInput,
    });
  typia.assert(createdReport);

  // 2. Extract the reportId for admin retrieval
  const reportId = createdReport.id;

  // 3. Retrieve the report as admin
  const adminReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.admin.reports.at(connection, {
      reportId,
    });
  typia.assert(adminReport);

  // 4. Validate that returned report has all expected/sensitive fields
  TestValidator.equals("report id matches")(adminReport.id)(reportId);
  TestValidator.equals("report reason matches")(adminReport.reason)(
    reportCreateInput.reason,
  );
  TestValidator.predicate("report includes reporter_id")(
    !!adminReport.reporter_id,
  );
  TestValidator.predicate("report includes status")(!!adminReport.status);
  TestValidator.predicate("report includes created_at")(
    !!adminReport.created_at,
  );
  if (reportCreateInput.content_type === "post") {
    TestValidator.equals("reported_post_id matches")(
      adminReport.reported_post_id,
    )(reportCreateInput.reported_post_id);
    TestValidator.equals("reported_comment_id is null")(
      adminReport.reported_comment_id,
    )(null);
  } else {
    TestValidator.equals("reported_comment_id matches")(
      adminReport.reported_comment_id,
    )(reportCreateInput.reported_comment_id);
    TestValidator.equals("reported_post_id is null")(
      adminReport.reported_post_id,
    )(null);
  }
  TestValidator.equals("content type matches")(adminReport.content_type)(
    reportCreateInput.content_type,
  );
}
