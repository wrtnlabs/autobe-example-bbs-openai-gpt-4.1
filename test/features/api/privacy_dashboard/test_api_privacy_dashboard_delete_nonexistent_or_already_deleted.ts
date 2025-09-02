import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPrivacyDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPrivacyDashboard";

/**
 * Test deletion idempotency and error handling for privacy dashboard
 * compliance record.
 *
 * This test ensures that attempting to delete a privacy dashboard that is
 * already deleted (soft-deleted) or non-existent yields a proper error.
 * Steps:
 *
 * 1. Create an admin (authenticates automatically).
 * 2. Create a privacy dashboard record via the admin.
 * 3. Delete the privacy dashboard (should succeed).
 * 4. Attempt to delete the same privacy dashboard again.
 *
 *    - Validate the second call throws an error (e.g., not found or already
 *         deleted).
 *    - Ensures API does not silently pass but enforces strong error handling for
 *         already-deleted records.
 */
export async function test_api_privacy_dashboard_delete_nonexistent_or_already_deleted(
  connection: api.IConnection,
) {
  // Step 1: Create an admin and auto-login
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a privacy dashboard record
  const dashboard =
    await api.functional.discussionBoard.admin.privacyDashboards.create(
      connection,
      {
        body: {
          discussion_board_user_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          access_requested_at: new Date().toISOString(),
          dashboard_payload: JSON.stringify({ status: "active" }),
          export_file_uri: null,
        } satisfies IDiscussionBoardPrivacyDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // Step 3: Delete the dashboard (should succeed)
  await api.functional.discussionBoard.admin.privacyDashboards.erase(
    connection,
    {
      privacyDashboardId: dashboard.id,
    },
  );

  // Step 4: Attempt to delete the same dashboard again (should throw)
  await TestValidator.error(
    "second delete should fail for already-deleted dashboard",
    async () => {
      await api.functional.discussionBoard.admin.privacyDashboards.erase(
        connection,
        {
          privacyDashboardId: dashboard.id,
        },
      );
    },
  );
}
