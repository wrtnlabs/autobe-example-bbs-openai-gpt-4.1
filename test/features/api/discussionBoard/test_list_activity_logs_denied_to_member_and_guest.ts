import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPageIDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActivityLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * Validate that non-moderator roles (member or guest) are unable to access
 * moderator activity logs.
 *
 * Purpose: To ensure both authenticated members and unauthenticated guests are
 * correctly forbidden from accessing sensitive moderator analytics endpoints.
 * Only users with the moderator/admin role should have access to
 * /discussionBoard/moderator/activityLogs.
 *
 * Workflow:
 *
 * 1. Set up a regular member (using admin endpoint, as setup prerequisite).
 * 2. Attempt to list activity logs as this member (simulate authenticated request
 *    with member credentials).
 *
 *    - Expect unauthorized (401) or forbidden (403) error response.
 * 3. Attempt as guest (no authentication header set).
 *
 *    - Again, expect unauthorized (401) or forbidden (403) error response.
 * 4. For both, verify that access is NOT granted and proper error is thrown.
 */
export async function test_api_discussionBoard_test_list_activity_logs_denied_to_member_and_guest(
  connection: api.IConnection,
) {
  // 1. Create a valid discussion board member for testing (using admin endpoint)
  const user_identifier: string = RandomGenerator.alphaNumeric(16);
  const joined_at: string = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier,
        joined_at,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Simulate member login (as no explicit login endpoint exists, set a mock Authorization header)
  if (!connection.headers) connection.headers = {};
  connection.headers.Authorization = `Bearer member-token-for-${member.user_identifier}`;
  await TestValidator.error("Members cannot access moderator activity logs")(
    async () => {
      await api.functional.discussionBoard.moderator.activityLogs.index(
        connection,
      );
    },
  );

  // 3. Simulate guest by removing the Authorization header (unauthenticated)
  delete connection.headers.Authorization;
  await TestValidator.error("Guests cannot access moderator activity logs")(
    async () => {
      await api.functional.discussionBoard.moderator.activityLogs.index(
        connection,
      );
    },
  );
}
