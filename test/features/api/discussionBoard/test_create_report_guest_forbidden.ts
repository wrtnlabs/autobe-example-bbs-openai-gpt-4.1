import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Verify that guests (unauthenticated users) are forbidden from creating
 * discussion board reports.
 *
 * Business context: Only logged-in members, moderators, or admins are
 * authorized to file moderation reports against abusive or inappropriate
 * content. This test ensures the API enforces access restrictions properly by
 * rejecting guest report submission attempts.
 *
 * Test steps:
 *
 * 1. Prepare a fresh unauthenticated API connection (guest session).
 * 2. Attempt to submit a discussion board report as a guest, using valid-looking
 *    data.
 * 3. Assert that the API responds with an authorization error (e.g., 401
 *    Unauthorized or 403 Forbidden), confirming guests are not permitted to use
 *    this endpoint.
 */
export async function test_api_discussionBoard_test_create_report_guest_forbidden(
  connection: api.IConnection,
) {
  // 1. Prepare a report submission payload (valid format, guest user)
  const payload: IDiscussionBoardReport.ICreate = {
    reporter_id: typia.random<string & tags.Format<"uuid">>(),
    content_type: "post",
    reported_post_id: typia.random<string & tags.Format<"uuid">>(),
    // For post reports, reported_comment_id stays null.
    reported_comment_id: null,
    reason: "Inappropriate content",
  };

  // 2. Attempt to create the report as a guest user
  await TestValidator.error("guests forbidden from report creation")(
    async () => {
      await api.functional.discussionBoard.member.reports.create(connection, {
        body: payload,
      });
    },
  );
}
