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
 * Validate admin detailed retrieval of privacy dashboard records.
 *
 * This test simulates the full privileged workflow for an admin being able
 * to view in detail a privacy dashboard export entry for a user. Flow:
 *
 * 1. Register a non-admin (standard) user who will be the subject of dashboard
 *    creation.
 * 2. Register a second user and elevate them to admin by joining as user and
 *    then as admin.
 * 3. Authenticate as the admin and create a privacy dashboard record for the
 *    standard user (supplying that user's id in the record).
 * 4. Retrieve the created dashboard record using its id as admin and validate:
 *
 *    - Record is returned
 *    - Timestamps and payloads match what was created
 *    - Metadata fields (export_file_uri, deleted_at) have expected values (can
 *         be null)
 *
 * The test covers setup, privilege elevation, record creation, and detailed
 * retrieval, ensuring full compliance for proper admin access.
 */
export async function test_api_admin_privacy_dashboard_detail_success(
  connection: api.IConnection,
) {
  // 1. Register a standard user (target of privacy dashboard)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password: "Str0ngP@ss!2024",
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);
  const userId = userJoin.user.id;

  // 2. Register an admin user (join & elevate)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name();
  const adminUserJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: "AdminStr0ng!2024",
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(adminUserJoin);
  // Elevate to admin (this will set Authorization token to admin)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserJoin.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 3. As admin, create a privacy dashboard record for the standard user
  const now = new Date();
  const requestTime = now.toISOString();
  const dashboardPayload = JSON.stringify({
    note: "Export summary for audit E2E",
    timestamp: requestTime,
  });
  const privacyDashboard =
    await api.functional.discussionBoard.admin.privacyDashboards.create(
      connection,
      {
        body: {
          discussion_board_user_id: userId,
          access_requested_at: requestTime,
          dashboard_payload: dashboardPayload,
          export_file_uri: null, // Not fulfilled yet
        } satisfies IDiscussionBoardPrivacyDashboard.ICreate,
      },
    );
  typia.assert(privacyDashboard);

  // 4. Retrieve the privacy dashboard record by id (as admin)
  const got = await api.functional.discussionBoard.admin.privacyDashboards.at(
    connection,
    {
      privacyDashboardId: privacyDashboard.id,
    },
  );
  typia.assert(got);

  // 5. Validate key fields and metadata
  TestValidator.equals("dashboard id matches", got.id, privacyDashboard.id);
  TestValidator.equals(
    "dashboard user id matches",
    got.discussion_board_user_id,
    userId,
  );
  TestValidator.equals(
    "dashboard request time matches",
    got.access_requested_at,
    requestTime,
  );
  TestValidator.equals(
    "dashboard payload matches",
    got.dashboard_payload,
    dashboardPayload,
  );
  TestValidator.equals(
    "dashboard export_file_uri is null (not fulfilled)",
    got.export_file_uri,
    null,
  );
  TestValidator.predicate(
    "dashboard fulfilled_at is null or ISO8601 date-time",
    got.access_fulfilled_at === null ||
      (typeof got.access_fulfilled_at === "string" &&
        !isNaN(Date.parse(got.access_fulfilled_at))),
  );
  TestValidator.equals(
    "deleted_at is null (not deleted)",
    got.deleted_at,
    null,
  );
}
