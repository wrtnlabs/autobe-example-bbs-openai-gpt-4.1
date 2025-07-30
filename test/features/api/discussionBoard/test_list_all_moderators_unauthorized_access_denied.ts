import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test non-admin access control enforcement for moderator list API.
 *
 * This test ensures that non-admin users, such as regular members, cannot
 * retrieve the list of all moderators via the admin endpoint. It verifies that
 * sensitive moderator role and assignment details remain protected from
 * unauthorized access, as required for system security and privacy.
 *
 * Steps:
 *
 * 1. Simulate a non-admin (regular) user context.
 * 2. Attempt to call the admin endpoint to fetch all moderators.
 * 3. Confirm that the call fails with an access denied/forbidden error, not
 *    allowing the user to see sensitive data.
 */
export async function test_api_discussionBoard_test_list_all_moderators_unauthorized_access_denied(
  connection: api.IConnection,
) {
  // 1. Assume connection is for a non-admin/regular member user (no admin role tokens).

  // 2. Attempt to fetch all moderators from the admin endpoint.
  await TestValidator.error("non-admin must be forbidden from moderator list")(
    async () => {
      await api.functional.discussionBoard.admin.moderators.index(connection);
    },
  );
}
