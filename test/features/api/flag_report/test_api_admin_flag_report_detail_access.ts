import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";

/**
 * Validate admin-level access to flag report detail.
 *
 * This test ensures that an admin can retrieve the detailed information for
 * a flag report using the privileged endpoint, and verifies complete type
 * and field correctness. It also validates proper security enforcement for
 * error paths: handling of non-existent report IDs and admin authentication
 * checks.
 *
 * Steps:
 *
 * 1. Register (join) as admin (random user_id).
 * 2. With admin credentials, fetch details for a (random plausible)
 *    flagReportId.
 * 3. Assert type and structure of the response using typia.assert and
 *    field-by-field checks for core attributes.
 * 4. Attempt retrieval with a non-existent flagReportId and expect a
 *    404/error.
 * 5. Attempt access with missing/invalid admin token and expect
 *    forbidden/unauthorized error.
 */
export async function test_api_admin_flag_report_detail_access(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Successful fetch with valid admin token and a plausible flagReportId
  const flagReportId = typia.random<string & tags.Format<"uuid">>();
  const report = await api.functional.discussionBoard.admin.flagReports.at(
    connection,
    { flagReportId },
  );
  typia.assert(report);

  // 3. Field-by-field checks of the returned report
  TestValidator.predicate(
    "flagReport has correct field types and required attributes",
    typeof report.id === "string" &&
      typeof report.reporterId === "string" &&
      (typeof report.postId === "string" ||
        typeof report.postId === "undefined") &&
      (typeof report.commentId === "string" ||
        typeof report.commentId === "undefined") &&
      typeof report.reason === "string" &&
      (typeof report.details === "string" ||
        typeof report.details === "undefined") &&
      typeof report.status === "string" &&
      (typeof report.reviewedAt === "string" ||
        typeof report.reviewedAt === "undefined") &&
      typeof report.createdAt === "string" &&
      typeof report.updatedAt === "string",
  );

  // 4. Attempt to fetch with a non-existent flagReportId
  const nonExistentFlagReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Should fail for unknown flagReportId (404 or not found)",
    async () => {
      await api.functional.discussionBoard.admin.flagReports.at(connection, {
        flagReportId: nonExistentFlagReportId,
      });
    },
  );

  // 5. Attempt unauthorized access – use fresh connection with no Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Should fail with forbidden/unauthorized for missing admin token",
    async () => {
      await api.functional.discussionBoard.admin.flagReports.at(unauthConn, {
        flagReportId,
      });
    },
  );
}
