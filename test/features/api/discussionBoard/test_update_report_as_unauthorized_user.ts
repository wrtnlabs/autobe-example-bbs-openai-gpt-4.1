import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Ensure that members without moderator/admin privileges cannot update
 * moderation reports.
 *
 * This test verifies proper enforcement of permission controls: a regular
 * member (who is not a moderator or admin) must not be able to update any
 * moderation report through the moderator endpoint. The expected behavior is a
 * permission error with no report modification.
 *
 * Steps:
 *
 * 1. Create a content report as a regular member (using member endpoint)
 * 2. Attempt to update the same report through the moderator endpoint (still as
 *    the non-privileged member)
 * 3. Expect the update to be denied, raising a permission error and leaving the
 *    report unmodified
 */
export async function test_api_discussionBoard_test_update_report_as_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Create a content report as a member
  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reporter_id: typia.random<string & tags.Format<"uuid">>(),
        content_type: "post",
        reported_post_id: typia.random<string & tags.Format<"uuid">>(),
        reason: "Unauthorized user report update test.",
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);

  // 2. Attempt to update the report through the moderator endpoint (should fail)
  await TestValidator.error("permission denied on unauthorized report update")(
    async () => {
      await api.functional.discussionBoard.moderator.reports.update(
        connection,
        {
          reportId: report.id,
          body: {
            status: "resolved",
            reason: "Trying to update as unauthorized user.",
            resolved_at: new Date().toISOString(),
          } satisfies IDiscussionBoardReport.IUpdate,
        },
      );
    },
  );
}
