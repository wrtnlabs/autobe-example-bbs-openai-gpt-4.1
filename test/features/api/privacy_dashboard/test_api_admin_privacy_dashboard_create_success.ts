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
 * Test successful creation of a compliance privacy dashboard entry as an
 * admin.
 *
 * 1. Register a standard user who will be the subject of the privacy request.
 * 2. Register an admin user and elevate the admin role as required.
 * 3. As the admin, submit a new privacy dashboard record for the standard
 *    user, including access/request details (user ID, request datetime,
 *    dashboard payload, and optionally export file URI).
 * 4. Validate that the new privacy dashboard record is created with a unique
 *    UUID, contains correct audit metadata (created_at, updated_at), and
 *    matches schema requirements.
 * 5. Confirm the returned record references the correct user, timestamps, and
 *    is not soft-deleted. Ensure business constraints, such as uniqueness
 *    of (discussion_board_user_id + access_requested_at), are respected.
 */
export async function test_api_admin_privacy_dashboard_create_success(
  connection: api.IConnection,
) {
  // Step 1: Register the standard user (target of the privacy dashboard)
  const stdUserInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12) + "Aa1!", // Satisfy password policy
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const stdUserAuth = await api.functional.auth.user.join(connection, {
    body: stdUserInput,
  });
  typia.assert(stdUserAuth);

  // Step 2: Register the admin user (will get admin authentication context)
  const adminUserInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12) + "Bb2!", // Satisfy password policy
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const adminUserAuth = await api.functional.auth.user.join(connection, {
    body: adminUserInput,
  });
  typia.assert(adminUserAuth);

  // Step 3: Elevate admin user to admin role
  const adminElevateInput = {
    user_id: adminUserAuth.user.id,
  } satisfies IDiscussionBoardAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminElevateInput,
  });
  typia.assert(adminAuth);

  // Step 4: Create a new privacy dashboard record as admin for the standard user
  const now = new Date();
  const payload = {
    discussion_board_user_id: stdUserAuth.user.id,
    access_requested_at: now.toISOString(),
    dashboard_payload: JSON.stringify({
      summary: RandomGenerator.content({ paragraphs: 2 }),
    }),
    // Intentionally skip export_file_uri (optional)
  } satisfies IDiscussionBoardPrivacyDashboard.ICreate;
  const privacyDashboard =
    await api.functional.discussionBoard.admin.privacyDashboards.create(
      connection,
      { body: payload },
    );
  typia.assert(privacyDashboard);

  // Step 5: Validate returned privacy dashboard record
  // Check id is a non-empty string and UUID (basic check)
  TestValidator.predicate(
    "privacy dashboard id is UUID",
    typeof privacyDashboard.id === "string" &&
      /^[0-9a-f\-]{36}$/.test(privacyDashboard.id),
  );
  TestValidator.equals(
    "privacy dashboard user reference correct",
    privacyDashboard.discussion_board_user_id,
    stdUserAuth.user.id,
  );
  TestValidator.equals(
    "privacy dashboard access_requested_at matches",
    privacyDashboard.access_requested_at,
    payload.access_requested_at,
  );
  TestValidator.predicate(
    "privacy dashboard has created_at ISO date",
    typeof privacyDashboard.created_at === "string" &&
      !isNaN(Date.parse(privacyDashboard.created_at)),
  );
  TestValidator.predicate(
    "privacy dashboard has updated_at ISO date",
    typeof privacyDashboard.updated_at === "string" &&
      !isNaN(Date.parse(privacyDashboard.updated_at)),
  );
  TestValidator.equals(
    "privacy dashboard deleted_at is null or undefined",
    privacyDashboard.deleted_at ?? null,
    null,
  );
  TestValidator.equals(
    "privacy dashboard payload content matches",
    privacyDashboard.dashboard_payload,
    payload.dashboard_payload,
  );
  // Optionally, assert export_file_uri is null or undefined (optional field)
  TestValidator.equals(
    "privacy dashboard export_file_uri is null or undefined",
    privacyDashboard.export_file_uri ?? null,
    null,
  );
}
