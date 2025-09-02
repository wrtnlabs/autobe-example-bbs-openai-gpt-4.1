import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPrivacyDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPrivacyDashboard";

/**
 * Test successful update of a privacy dashboard record by an authenticated
 * admin.
 *
 * Scenario:
 *
 * 1. Register an admin (establishes admin authentication context).
 * 2. Create a privacy dashboard for a random user under admin context.
 * 3. Update the privacy dashboard using the admin endpoint, modifying fields
 *    (fulfilled timestamp, payload content, export URI).
 * 4. Confirm the updated record reflects the changes exactly as specified in
 *    the update payload.
 */
export async function test_api_privacy_dashboard_update_admin_success(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain admin authentication context
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a privacy dashboard record as admin
  const createDashboardInput = {
    discussion_board_user_id: typia.random<string & tags.Format<"uuid">>(),
    access_requested_at: new Date().toISOString(),
    dashboard_payload: RandomGenerator.paragraph({ sentences: 10 }),
    export_file_uri: null,
  } satisfies IDiscussionBoardPrivacyDashboard.ICreate;
  const privacyDashboard =
    await api.functional.discussionBoard.admin.privacyDashboards.create(
      connection,
      {
        body: createDashboardInput,
      },
    );
  typia.assert(privacyDashboard);

  // 3. Update fields: fulfill, edit summary payload, add export URI
  const updatePayload = {
    access_fulfilled_at: new Date().toISOString(),
    dashboard_payload: RandomGenerator.paragraph({ sentences: 15 }),
    export_file_uri: "https://example.com/privacy-export.zip",
  } satisfies IDiscussionBoardPrivacyDashboard.IUpdate;
  const updatedDashboard =
    await api.functional.discussionBoard.admin.privacyDashboards.update(
      connection,
      {
        privacyDashboardId: privacyDashboard.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedDashboard);

  // 4. Validate updates and business logic
  TestValidator.equals(
    "access_fulfilled_at field updated correctly",
    updatedDashboard.access_fulfilled_at,
    updatePayload.access_fulfilled_at,
  );
  TestValidator.equals(
    "dashboard_payload field updated correctly",
    updatedDashboard.dashboard_payload,
    updatePayload.dashboard_payload,
  );
  TestValidator.equals(
    "export_file_uri field updated correctly",
    updatedDashboard.export_file_uri,
    updatePayload.export_file_uri,
  );
  TestValidator.equals(
    "privacy dashboard id unchanged after update",
    updatedDashboard.id,
    privacyDashboard.id,
  );
  TestValidator.equals(
    "associated user id unchanged after update",
    updatedDashboard.discussion_board_user_id,
    createDashboardInput.discussion_board_user_id,
  );
}
