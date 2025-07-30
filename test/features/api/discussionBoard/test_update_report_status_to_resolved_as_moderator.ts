import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Verify that a moderator can update the status of a content report from
 * 'pending' to 'resolved'.
 *
 * This test covers the following business workflow:
 *
 * 1. A member creates a moderation report for questionable content (post or
 *    comment).
 * 2. A moderator retrieves the report by its unique ID to ensure visibility before
 *    update.
 * 3. The moderator updates the report's status to 'resolved', optionally adding a
 *    resolution note via the reason field, and sets the resolved_at timestamp
 *    to now.
 * 4. The updated report is returned and validated for:
 *
 *    - Status = 'resolved'
 *    - Reason = the resolution annotation
 *    - Resolved_at is set (not null)
 */
export async function test_api_discussionBoard_test_update_report_status_to_resolved_as_moderator(
  connection: api.IConnection,
) {
  // 1. Create a pending report as member
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const reportedPostId = typia.random<string & tags.Format<"uuid">>();
  const reportCreate: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reporter_id: memberId,
        content_type: "post",
        reported_post_id: reportedPostId,
        reason: "Spam or misleading content",
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(reportCreate);
  TestValidator.equals("pending status upon creation")(reportCreate.status)(
    "pending",
  );

  // 2. (As moderator) fetch the report by its id
  const reportFetched: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.at(connection, {
      reportId: reportCreate.id,
    });
  typia.assert(reportFetched);
  TestValidator.equals("report identity")(reportFetched.id)(reportCreate.id);

  // 3. Update report: set status to 'resolved', reason to resolution note, resolve timestamp
  const resolutionNote = "Issue investigated and resolved by moderator";
  const now = new Date().toISOString();
  const reportUpdated: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.update(connection, {
      reportId: reportCreate.id,
      body: {
        status: "resolved",
        reason: resolutionNote,
        resolved_at: now,
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  typia.assert(reportUpdated);
  TestValidator.equals("status updated")(reportUpdated.status)("resolved");
  TestValidator.equals("resolution note")(reportUpdated.reason)(resolutionNote);
  TestValidator.equals("resolved_at set")(reportUpdated.resolved_at)(now);
}
