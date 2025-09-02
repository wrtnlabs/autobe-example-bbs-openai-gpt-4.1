import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Soft deletion and compliance trace for discussion board flag report as
 * admin.
 *
 * This test simulates soft-deleting a flag report by a platform admin to
 * assure audit logging, proper timestamp marking, and error logic for
 * corner cases.
 *
 * 1. Register an admin to get admin session.
 * 2. Soft-delete a random, reviewable flag report ID.
 * 3. Attempt to soft-delete again (double delete) and expect logic error
 *    (e.g., not found or already deleted).
 * 4. Attempt to delete a clearly non-existent flag report ID and confirm error
 *    (not found).
 * 5. Validate all error logic using TestValidator.error with clear titles.
 *
 * Note: As the current public/test API does not provide direct endpoints to
 * create flag reports or list/search them, nor to confirm deleted_at or
 * ensure audit queries, this test focuses on input/process/error logic for
 * the deletion process and compliance trace obligations via API.
 */
export async function test_api_admin_flag_report_soft_delete_and_compliance_trace(
  connection: api.IConnection,
) {
  // 1. Register an admin - placeholder for required userId.
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Soft-delete a random (reviewable) flag report ID.
  const reviewableFlagReportId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.discussionBoard.admin.flagReports.erase(connection, {
    flagReportId: reviewableFlagReportId,
  });

  // 3. Attempt to delete again - expect error (already deleted or not found)
  await TestValidator.error(
    "delete already-deleted flag report should error",
    async () => {
      await api.functional.discussionBoard.admin.flagReports.erase(connection, {
        flagReportId: reviewableFlagReportId,
      });
    },
  );

  // 4. Attempt to delete a non-existent flagReportId
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent flag report should error",
    async () => {
      await api.functional.discussionBoard.admin.flagReports.erase(connection, {
        flagReportId: nonExistentReportId,
      });
    },
  );

  // 5. Note: As there is no report-list/search endpoint, cannot directly assert exclusion from moderation view.
}
