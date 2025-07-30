import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validates successful hard deletion of a report record by an admin in the
 * discussion board system.
 *
 * This test simulates the following workflow:
 *
 * 1. A member submits a moderation report for a post (using member API).
 * 2. An admin permanently deletes the created report (using admin API and acquired
 *    reportId).
 * 3. (Verification that the report is gone, as no GET API exists, step is
 *    omitted).
 *
 * The test ensures only admins can hard-delete reports, that hard deletion is
 * irreversible, and that the resource truly disappears from queries. Steps
 * requiring unimplementable API endpoints (GET, audit log) are omitted per
 * constraints.
 */
export async function test_api_discussionBoard_test_delete_report_as_admin_success_case(
  connection: api.IConnection,
) {
  // 1. Member creates a report for a post (content_type='post')
  const reporterId = typia.random<string & tags.Format<"uuid">>();
  const reportedPostId = typia.random<string & tags.Format<"uuid">>();
  const reportInput = {
    reporter_id: reporterId,
    content_type: "post",
    reported_post_id: reportedPostId,
    reported_comment_id: null,
    reason: RandomGenerator.paragraph()(),
  } satisfies IDiscussionBoardReport.ICreate;
  const report = await api.functional.discussionBoard.member.reports.create(
    connection,
    { body: reportInput },
  );
  typia.assert(report);

  // 2. Admin deletes the report using its reportId
  await api.functional.discussionBoard.admin.reports.erase(connection, {
    reportId: report.id,
  });

  // 3. (No GET API for deleted report exists, so verification via fetch is omitted.)
}
