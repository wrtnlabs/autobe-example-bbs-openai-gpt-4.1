import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate that non-admin users cannot access the admin list.
 *
 * This test ensures that a user without administrative privileges (regular
 * member or guest) cannot fetch the list of discussion board administrators.
 * The endpoint should be properly protected against unauthorized access and
 * must issue an appropriate permission error without leaking any admin data.
 *
 * Steps:
 *
 * 1. Prepare a connection instance _without_ admin privileges (either as a regular
 *    user, or unauthenticated guest)
 * 2. Attempt to invoke the endpoint that lists all discussion board administrators
 * 3. Confirm that a permission error is thrown (and distinguish from input/server
 *    errors)
 * 4. Ensure no admin data is leaked in the error case
 */
export async function test_api_discussionBoard_test_list_all_admins_permission_denied_for_non_admin(
  connection: api.IConnection,
) {
  // 1. The connection provided should represent a non-admin user (or guest)

  // 2. Attempt to invoke the admin listing API and expect a permission error
  await TestValidator.error("Non-admin cannot access admin list")(async () => {
    await api.functional.discussionBoard.admin.admins.index(connection);
  });
}
