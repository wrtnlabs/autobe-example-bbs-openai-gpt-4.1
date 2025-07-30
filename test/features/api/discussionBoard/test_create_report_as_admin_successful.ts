import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate that an admin can successfully create a moderation report via the
 * discussionBoard admin reports endpoint.
 *
 * This test confirms the platform allows admins to directly file moderation
 * reports, such as when they independently identify policy issues or respond to
 * complaints flagged by other means. The test ensures that only required fields
 * are set, at least one of reported_post_id or reported_comment_id is correctly
 * assigned according to content_type, and that admin-level creation is accepted
 * by the server.
 *
 * Steps involved:
 *
 * 1. Generate a valid report payload as an admin, reporting either a post or a
 *    comment (randomly chosen).
 * 2. Call the /discussionBoard/admin/reports POST endpoint with the admin
 *    credentials and the prepared payload.
 * 3. Validate that the response contains a new report entity with metadata,
 *    admin's reporter_id, appropriate content_type, set status (should be
 *    'pending' initially), creation timestamp, and no resolved_at since it's a
 *    fresh report.
 * 4. For the selected report type, check that only the correct ID field is
 *    populated, and the irrelevant field is null as per schema contract.
 */
export async function test_api_discussionBoard_test_create_report_as_admin_successful(
  connection: api.IConnection,
) {
  // 1. Prepare admin context and valid moderation report payload
  // (Assume connection context has admin privileges. Randomly choose a report kind.)

  const reporter_id: string = typia.random<string & tags.Format<"uuid">>();
  const reportKind = Math.random() < 0.5 ? "post" : "comment";

  const payload: IDiscussionBoardReport.ICreate =
    reportKind === "post"
      ? {
          reporter_id,
          content_type: "post",
          reported_post_id: typia.random<string & tags.Format<"uuid">>(),
          reported_comment_id: null,
          reason: "Violation of community guidelines (test)",
        }
      : {
          reporter_id,
          content_type: "comment",
          reported_post_id: null,
          reported_comment_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Inappropriate comment content (test)",
        };

  // 2. Perform the API call as admin
  const output = await api.functional.discussionBoard.admin.reports.create(
    connection,
    {
      body: payload,
    },
  );
  typia.assert(output);

  // 3. Validate core metadata and field assignment
  TestValidator.equals("reporter_id matches")(output.reporter_id)(reporter_id);
  TestValidator.equals("content_type matches")(output.content_type)(
    payload.content_type,
  );
  TestValidator.equals("status should be pending")(output.status)("pending");
  TestValidator.predicate("created_at present and is a valid ISO date-time")(
    typeof output.created_at === "string" &&
      !isNaN(Date.parse(output.created_at)),
  );
  TestValidator.equals("resolved_at should be null for new report")(
    output.resolved_at,
  )(null);

  // 4. For the selected report type, check only the correct ID field is populated
  if (reportKind === "post") {
    TestValidator.equals("reported_post_id set")(output.reported_post_id)(
      payload.reported_post_id,
    );
    TestValidator.equals("reported_comment_id should be null")(
      output.reported_comment_id,
    )(null);
  } else {
    TestValidator.equals("reported_comment_id set")(output.reported_comment_id)(
      payload.reported_comment_id,
    );
    TestValidator.equals("reported_post_id should be null")(
      output.reported_post_id,
    )(null);
  }
}
