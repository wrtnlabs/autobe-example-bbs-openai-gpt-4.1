import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPrivacyDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPrivacyDashboard";

/**
 * Validate not found error when admin retrieves a privacy dashboard detail
 * with a non-existent privacyDashboardId.
 *
 * This test assures robust compliance/privacy protection by ensuring that:
 *
 * - Only authenticated admins can access privacy dashboard details.
 * - Requests for non-existent or deleted dashboards return a not found error
 *   (ideally 404).
 *
 * Process:
 *
 * 1. Register an admin account to obtain authentication for admin-only
 *    endpoints.
 * 2. Attempt to access privacy dashboard with a fresh random UUID (does not
 *    exist), expect failure (not found).
 * 3. Attempt the same request without authentication, expect access denial
 *    (unauthorized/forbidden).
 */
export async function test_api_admin_privacy_dashboard_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register an admin account (for admin privilege, set Authorization token)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. As authenticated admin, attempt a GET with a non-existent privacyDashboardId
  const fakePrivacyDashboardId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "GET privacyDashboard with non-existent id returns not found",
    async () => {
      await api.functional.discussionBoard.admin.privacyDashboards.at(
        connection,
        {
          privacyDashboardId: fakePrivacyDashboardId,
        },
      );
    },
  );

  // 3. Try the same request without authentication; must be forbidden/unauthorized
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "GET privacyDashboard without admin authentication fails",
    async () => {
      await api.functional.discussionBoard.admin.privacyDashboards.at(
        unauthConn,
        {
          privacyDashboardId: fakePrivacyDashboardId,
        },
      );
    },
  );
}
