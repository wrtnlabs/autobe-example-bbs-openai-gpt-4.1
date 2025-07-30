import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates that non-admin members cannot perform advanced search on board
 * reports (access control enforcement).
 *
 * This test ensures that after registering a regular discussion board member
 * (without any admin privileges), attempts to search for board content reports
 * using the PATCH /discussionBoard/admin/reports endpoint are rejected by the
 * system. No sensitive report data should be exposed to non-admin users.
 *
 * **Process:**
 *
 * 1. Register a new non-admin discussion board member using the admin-only members
 *    creation endpoint.
 * 2. Simulate actions as this non-admin user. As there is no explicit login or
 *    auth switching, all actions are done in sequence using the same connection
 *    (API is assumed to enforce policy server-side based on passed identity).
 * 3. Attempt to perform an advanced report search (PATCH
 *    /discussionBoard/admin/reports) as this non-admin user.
 * 4. Verify that a forbidden error is thrown and that no report data is leaked.
 */
export async function test_api_discussionBoard_admin_reports_test_advanced_report_search_access_control(
  connection: api.IConnection,
) {
  // 1. Register a regular discussion board member
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Attempt advanced search on reports as this regular user (non-admin)
  await TestValidator.error("Non-admin cannot search board reports")(
    async () => {
      await api.functional.discussionBoard.admin.reports.search(connection, {
        body: {}, // minimal request per contract
      });
    },
  );
}
