import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";
import type { IPageIDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActivityLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that searching activity logs as a non-admin member is properly
 * forbidden.
 *
 * This test confirms that non-administrative users cannot access the advanced
 * audit log search API endpoint intended for admins.
 *
 * 1. Create a member using the admin API.
 * 2. Simulate a member (or unauthenticated) session by removing Authorization from
 *    the connection ensuring the credentials do not have admin privileges.
 * 3. Attempt to perform a PATCH search for activity logs with this non-admin
 *    session.
 * 4. Confirm that access is denied by asserting an error is thrown.
 */
export async function test_api_discussionBoard_test_activity_logs_search_forbidden_for_non_admins(
  connection: api.IConnection,
) {
  // 1. Admin creates a member via admin-only endpoint
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphabets(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Simulate a non-admin session by removing Authorization from the connection
  const nonAdminConnection: api.IConnection = {
    ...connection,
    headers: Object.fromEntries(
      Object.entries(connection.headers ?? {}).filter(
        ([key]) => key.toLowerCase() !== "authorization",
      ),
    ),
  };

  // 3. Attempt to PATCH search activity logs as a non-admin (should be forbidden)
  await TestValidator.error("activity log search forbidden for non-admin")(
    async () => {
      await api.functional.discussionBoard.admin.activityLogs.search(
        nonAdminConnection,
        {
          body: {}, // No specific filter; any request should be forbidden for non-admins
        },
      );
    },
  );
}
