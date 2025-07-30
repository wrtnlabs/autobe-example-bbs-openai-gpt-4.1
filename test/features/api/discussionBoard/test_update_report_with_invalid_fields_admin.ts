import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test that an admin user cannot update a report with invalid or disallowed
 * fields on /discussionBoard/admin/reports/{reportId}.
 *
 * This test verifies that the API correctly rejects updates to a report when
 * the admin supplies invalid business data, such as an unsupported status value
 * or marking a report as resolved without providing proper annotation/fields as
 * per business rules.
 *
 * Test Steps:
 *
 * 1. A member creates a valid content report via the member reports endpoint
 *    (creating a real report record to work with).
 * 2. As admin, attempt to update the report with an invalid status value (e.g.,
 *    'invalid_status') and expect a validation/business error.
 * 3. As admin, attempt to update the report by marking it as 'resolved' but
 *    without providing a reason or resolved_at timestamp, violating business
 *    rules.
 * 4. After each failure, confirm the API responds with an error and that the
 *    report's state has not been changed (state validation cannot be performed
 *    since there is no GET endpoint; this is noted).
 */
export async function test_api_discussionBoard_test_update_report_with_invalid_fields_admin(
  connection: api.IConnection,
) {
  // 1. Member creates a valid report
  const reportCreateInput = {
    reporter_id: typia.random<string & tags.Format<"uuid">>(),
    content_type: "post",
    reported_post_id: typia.random<string & tags.Format<"uuid">>(),
    reason: "Spam content test",
  } satisfies IDiscussionBoardReport.ICreate;
  const created = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: reportCreateInput,
    },
  );
  typia.assert(created);

  // 2. Attempt invalid status update as admin
  await TestValidator.error("disallowed status value should fail")(async () => {
    await api.functional.discussionBoard.admin.reports.update(connection, {
      reportId: created.id,
      body: {
        status: "invalid_status",
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  });

  // 3. Attempt to mark as resolved without required annotation (e.g., reason or resolved_at)
  await TestValidator.error(
    "resolved without reason or resolved_at should fail",
  )(async () => {
    await api.functional.discussionBoard.admin.reports.update(connection, {
      reportId: created.id,
      body: {
        status: "resolved",
        // Intentionally omitting reason and resolved_at
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  });

  // 4. (Optional) State-checking is omitted due to absence of GET endpoint.
}
