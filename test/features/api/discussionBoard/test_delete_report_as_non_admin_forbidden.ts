import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate that only admins can delete discussion board reports—non-admin users
 * must receive a forbidden error.
 *
 * Business purpose:
 *
 * - Ensures that report deletion (a destructive/sensitive moderation action) is
 *   strictly restricted to admin roles per business rules and compliance/audit
 *   requirements.
 * - Verifies that no member or moderator can bypass privilege boundaries to erase
 *   reports, preserving evidence and moderation integrity.
 *
 * Test Workflow:
 *
 * 1. Create a report as a normal (non-admin) member.
 * 2. Attempt to delete the report via the admin-only endpoint with a non-admin
 *    session.
 * 3. Confirm the system throws a forbidden error (privilege escalation is
 *    blocked).
 */
export async function test_api_discussionBoard_test_delete_report_as_non_admin_forbidden(
  connection: api.IConnection,
) {
  // 1. Create a report as a member (simulate non-admin credentials)
  const memberId: string = typia.random<string & tags.Format<"uuid">>();
  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reporter_id: memberId,
        content_type: "post",
        reported_post_id: typia.random<string & tags.Format<"uuid">>(),
        reported_comment_id: null,
        reason: "Testing non-admin forbidden deletion",
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);

  // 2. Attempt to delete as non-admin role (should fail with forbidden error)
  await TestValidator.error("Only admin may delete a report")(async () => {
    await api.functional.discussionBoard.admin.reports.erase(connection, {
      reportId: report.id,
    });
  });
}
