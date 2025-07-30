import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Verify that non-admin users cannot access the session inventory endpoint.
 *
 * This test attempts to access the /discussionBoard/admin/userSessions endpoint
 * as a regular, non-admin user. The test ensures that the endpoint enforces
 * strict access controls and does not allow non-admin users to enumerate or
 * view user/guest session records, which would be a serious security
 * violation.
 *
 * Steps:
 *
 * 1. Assume the current connection does not have admin privileges (either an
 *    unauthenticated guest or authenticated as a non-admin user)
 * 2. Attempt to retrieve the list of user/guest sessions via GET
 *    /discussionBoard/admin/userSessions
 * 3. Expect an authorization error or forbidden response. The request should throw
 *    an exception (likely an HttpError with status 401 or 403).
 * 4. Passes only if an authorization error occurs; fails if the sessions are
 *    visible to a non-admin.
 */
export async function test_api_discussionBoard_test_forbidden_access_to_user_sessions_listing_by_non_admin(
  connection: api.IConnection,
) {
  // Step 1: Assume non-admin context (no admin authentication performed)

  // Step 2 & 3: Attempt the admin endpoint; expect forbidden error
  await TestValidator.error("non-admin cannot list sessions")(async () => {
    await api.functional.discussionBoard.admin.userSessions.index(connection);
  });
}
