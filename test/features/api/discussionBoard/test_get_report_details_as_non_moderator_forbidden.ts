import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate access control on fetching detailed moderation reports.
 *
 * Scenario: Ensure that a standard member (not moderator/admin) cannot fetch
 * report details via the moderator report detail endpoint.
 *
 * 1. Create a report as a standard member (using the create report endpoint).
 * 2. While still authenticated as a normal member, attempt to fetch the created
 *    report using the moderator endpoint (GET
 *    /discussionBoard/moderator/reports/{reportId}).
 * 3. Confirm that a permission error (forbidden/unauthorized) is returned, not the
 *    report details.
 * 4. (Edge case) Assert that the error is thrown and no details are leaked.
 */
export async function test_api_discussionBoard_test_get_report_details_as_non_moderator_forbidden(
  connection: api.IConnection,
) {
  // 1. Create a report as a member
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const reportCreateBody: IDiscussionBoardReport.ICreate = {
    reporter_id: memberId,
    content_type: "post", // could also be 'comment' + reported_comment_id, but 'post' is sufficient for this scenario
    reported_post_id: typia.random<string & tags.Format<"uuid">>(),
    reported_comment_id: null,
    reason: "Testing access control for moderation reports",
  };
  const createdReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(createdReport);

  // 2. As a normal member (not moderator), attempt to fetch the report as if a moderator
  await TestValidator.error(
    "forbidden error for non-moderator on moderator report detail",
  )(async () => {
    await api.functional.discussionBoard.moderator.reports.at(connection, {
      reportId: createdReport.id,
    });
  });
}
