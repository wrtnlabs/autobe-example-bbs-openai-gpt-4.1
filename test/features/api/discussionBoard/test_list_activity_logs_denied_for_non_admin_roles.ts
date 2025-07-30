import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPageIDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActivityLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * Validate that non-admin users (regular member or guest) are denied access to
 * admin activity logs.
 *
 * Business context: The /discussionBoard/admin/activityLogs endpoint exposes
 * sensitive audit trail data used for compliance and security. These logs must
 * not be viewable by ordinary members or unauthenticated guests. Only admin
 * accounts may access this API. This test ensures that user privilege
 * boundaries are enforced.
 *
 * Test Steps:
 *
 * 1. As admin, create a member (this member will have only member-level
 *    privileges).
 * 2. Log out to simulate guest (no authentication).
 * 3. As guest, attempt GET /discussionBoard/admin/activityLogs and expect
 *    forbidden/unauthorized error.
 * 4. (Documented only - no member login endpoint) Ideally, log in as the member
 *    created in step 1 and retry, expecting error. Currently skipped due to
 *    missing API.
 *
 * Success criteria:
 *
 * - Both guest and member requests must fail with forbidden or unauthorized
 *   error.
 * - No sensitive audit data should be returned to non-admin users.
 */
export async function test_api_discussionBoard_test_list_activity_logs_denied_for_non_admin_roles(
  connection: api.IConnection,
) {
  // 1. As admin, create a member for negative testing
  const memberInput = {
    user_identifier: typia.random<string>(),
    joined_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IDiscussionBoardMember.ICreate;
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberInput },
  );
  typia.assert(member);

  // 2. Simulate guest (remove Authorization header)
  const guestConnection = { ...connection, headers: { ...connection.headers } };
  delete guestConnection.headers["Authorization"];

  // 3. As guest, attempt to access admin-only activity logs (expect error)
  await TestValidator.error("guest denied activity logs")(() =>
    api.functional.discussionBoard.admin.activityLogs.index(guestConnection),
  );

  // 4. Member negative case cannot be tested without member authentication endpoint.
  //    When a member login API becomes available, add:
  //    - Login as member, then
  //    - Try admin activityLogs API and validate error.
}
