import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPrivacyDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPrivacyDashboard";

/**
 * Test the successful soft deletion (compliance "erase") of a privacy
 * dashboard as an authenticated admin.
 *
 * This test verifies that an admin with appropriate context can create and
 * then soft-delete (erase) a privacy dashboard record, and that the
 * deletion endpoint works as expected in the business context:
 *
 * 1. Register and authenticate a new admin via admin join (requires
 *    pre-existing user_id, here we use a test/generated UUID).
 * 2. Create a privacy dashboard record for a random discussion board user
 *    (again, we use a test UUID for user association).
 * 3. Soft delete that privacy dashboard, asserting the operation completes
 *    without error.
 * 4. (Note: Since there is no provided 'get' or 'list' endpoint for privacy
 *    dashboards, compliance validation of deleted_at state and omission
 *    from regular queries is LIMITED in this end-to-end test. These would
 *    require out-of-band database assertion or extension endpoints.)
 *
 * No negative (permission/validation error) cases are covered in this
 * positive-case scenario.
 */
export async function test_api_privacy_dashboard_delete_admin_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const testAdminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: testAdminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);
  // Ensure admin context is valid and active
  TestValidator.equals(
    "admin id matches user id",
    adminAuth.admin.user_id,
    testAdminUserId,
  );
  TestValidator.predicate("admin is active", adminAuth.admin.is_active);
  // 2. Create a privacy dashboard record
  const privacyDashboardUserId = typia.random<string & tags.Format<"uuid">>();
  const dashboard =
    await api.functional.discussionBoard.admin.privacyDashboards.create(
      connection,
      {
        body: {
          discussion_board_user_id: privacyDashboardUserId,
          access_requested_at: new Date().toISOString(),
          dashboard_payload: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies IDiscussionBoardPrivacyDashboard.ICreate,
      },
    );
  typia.assert(dashboard);
  TestValidator.equals(
    "dashboard user id matches input",
    dashboard.discussion_board_user_id,
    privacyDashboardUserId,
  );
  // 3. Soft delete (erase) the privacy dashboard by id
  await api.functional.discussionBoard.admin.privacyDashboards.erase(
    connection,
    {
      privacyDashboardId: dashboard.id,
    },
  );
  // 4. (LIMITED) Cannot re-fetch dashboard or assert deleted_at via SDK (no endpoint); explain limitation
}
