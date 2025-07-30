import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Validate admin can update a report to link it to a moderation action.
 *
 * This workflow tests the ability of an admin to update moderation reports by
 * associating them with a moderation action record and updating the status.
 *
 * Steps:
 *
 * 1. A member submits a new content report (required fields: reporter_id,
 *    content_type, reported_post_id or reported_comment_id, reason).
 * 2. An admin creates a moderation action (for the reported post or comment);
 *    reference to actor and target is required.
 * 3. Admin updates the report, changing status (e.g., to 'resolved') and providing
 *    new admin reason and/or resolved_at timestamp.
 * 4. (Because the report <-> moderation action link is implied by the moderation
 *    action referencing the report, verify that the report status is updated
 *    and moderation action was properly created and uses the report id.)
 * 5. Validate that the response contains the correct new status and (optionally)
 *    check that the action is associated with the report.
 */
export async function test_api_discussionBoard_test_update_report_add_moderation_action_link_as_admin(
  connection: api.IConnection,
) {
  // 1. Create a new content report as a member
  const reporter_id = typia.random<string & tags.Format<"uuid">>();
  const reported_post_id = typia.random<string & tags.Format<"uuid">>();
  const report = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reporter_id,
        content_type: "post",
        reported_post_id,
        reported_comment_id: null,
        reason: "Test reason for moderation",
      },
    },
  );
  typia.assert(report);

  // 2. Create a moderation action as admin, referencing the same post and linking to the report
  const actor_admin_id = typia.random<string & tags.Format<"uuid">>();
  const moderationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      {
        body: {
          actor_admin_id,
          post_id: reported_post_id,
          comment_id: null,
          report_id: report.id,
          action_type: "delete",
          action_details: "Removed post as it violated guidelines.",
        },
      },
    );
  typia.assert(moderationAction);

  // 3. Admin updates the report's status to 'resolved', adds admin note, and a resolution timestamp
  const newStatus = "resolved";
  const adminNote = "Action taken and content removed.";
  const resolved_at = new Date().toISOString();
  const updatedReport =
    await api.functional.discussionBoard.admin.reports.update(connection, {
      reportId: report.id,
      body: {
        status: newStatus,
        reason: adminNote,
        resolved_at,
      },
    });
  typia.assert(updatedReport);

  // 4. Validate that the updatedReport.status, .reason and .resolved_at reflect the update
  TestValidator.equals("report status update")(updatedReport.status)(newStatus);
  TestValidator.equals("report admin note")(updatedReport.reason)(adminNote);
  TestValidator.equals("report resolved_at")(updatedReport.resolved_at)(
    resolved_at,
  );

  // 5. Optionally, confirm the moderation action references report id
  TestValidator.equals("moderation action references report")(
    moderationAction.report_id,
  )(report.id);
}
