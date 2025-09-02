import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardPrivacyDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPrivacyDashboard";

/**
 * Validate permission-denied enforcement for updating privacy dashboard as
 * non-admin.
 *
 * 1. Register and authenticate a regular user with unique email/username.
 * 2. Register and authenticate an admin user (create a verified regular user
 *    first).
 * 3. As admin, create a privacy dashboard entry (record the ID).
 * 4. Switch context to the regular user by authenticating as that user.
 * 5. Attempt to update the privacy dashboard (using the previously recorded
 *    ID) as a regular user.
 * 6. Assert that the API returns a permission error (e.g., 401 Unauthorized or
 *    403 Forbidden).
 *
 * This test ensures strong RBAC enforcement: only admins can update
 * compliance dashboards.
 */
export async function test_api_privacy_dashboard_update_admin_permission_denied(
  connection: api.IConnection,
) {
  // 1. Register and login a REGULAR USER (needed for both admin elevation and permission check)
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUsername = RandomGenerator.alphaNumeric(10);
  const regularUser: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: regularUserEmail,
        username: regularUsername,
        password: RandomGenerator.alphaNumeric(12) + "A!1",
        display_name: RandomGenerator.name(),
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(regularUser);

  // 2. Register and login an ADMIN account
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: regularUser.user.id,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(admin);

  // 3. As ADMIN, create a privacy dashboard record for the regular user
  const privacyDashboard: IDiscussionBoardPrivacyDashboard =
    await api.functional.discussionBoard.admin.privacyDashboards.create(
      connection,
      {
        body: {
          discussion_board_user_id: regularUser.user.id,
          access_requested_at: new Date().toISOString(),
          dashboard_payload: RandomGenerator.content({ paragraphs: 2 }),
          export_file_uri: null,
        } satisfies IDiscussionBoardPrivacyDashboard.ICreate,
      },
    );
  typia.assert(privacyDashboard);

  // 4. Register and login a new REGULAR USER for negative test (context switch to non-admin)
  const nonAdminEmail = typia.random<string & tags.Format<"email">>();
  const nonAdminUsername = RandomGenerator.alphaNumeric(10);
  const nonAdmin: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: nonAdminEmail,
        username: nonAdminUsername,
        password: RandomGenerator.alphaNumeric(12) + "B@2",
        display_name: RandomGenerator.name(),
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(nonAdmin);

  // 5. As the non-admin user, attempt to update the privacy dashboard record (should fail with permission error)
  await TestValidator.error(
    "non-admin user cannot update privacy dashboard",
    async () => {
      await api.functional.discussionBoard.admin.privacyDashboards.update(
        connection,
        {
          privacyDashboardId: privacyDashboard.id,
          body: {
            dashboard_payload: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies IDiscussionBoardPrivacyDashboard.IUpdate,
        },
      );
    },
  );
}
