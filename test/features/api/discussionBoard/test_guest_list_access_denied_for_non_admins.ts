import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Validate that non-admin users (guests, regular members, moderators) are
 * denied access to the admin guest session list endpoint.
 *
 * Business context: Only admin users are allowed to access the analytics list
 * of guest sessions. Guest session analytics data must not be exposed to users
 * who are not authenticated as admin. This test confirms that attempted access
 * by a non-admin (unauthenticated or lower privilege) fails securely, with no
 * response data leakage.
 *
 * Steps:
 *
 * 1. Attempt to access /discussionBoard/admin/guests as an unauthenticated (guest)
 *    user.
 *
 *    - Expect failure (forbidden or access denied), and confirm that no guest
 *         analytics data is leaked.
 * 2. (If possible in the project, repeat for a logged-in regular member and a
 *    moderator, otherwise document limitation.)
 * 3. Check that error is thrown and not a valid IPageIDiscussionBoardGuest value.
 */
export async function test_api_discussionBoard_test_guest_list_access_denied_for_non_admins(
  connection: api.IConnection,
) {
  // 1. Attempt access as guest (unauthenticated)
  await TestValidator.error("guest access denied")(() =>
    api.functional.discussionBoard.admin.guests.index(connection),
  );

  // Cannot simulate regular member or moderator login if no API for those roles is present.
  // Document limitation if APIs are not provided for member/moderator authentication.
}
