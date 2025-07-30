import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate that non-admin users are forbidden from accessing the board member
 * list.
 *
 * This test verifies the access control on the admin board member listing
 * endpoint. It ensures that users without admin privileges cannot retrieve the
 * list of all board members, and that an appropriate authorization error is
 * thrown when access is attempted.
 *
 * Test steps:
 *
 * 1. Create a regular (non-admin) member using the admin/member creation endpoint
 *    — as no explicit non-admin authentication APIs are available, the member
 *    is created for completeness.
 * 2. Attempt to retrieve the admin-only members list using a connection presumed
 *    to lack admin privileges.
 * 3. Assert that an access/authorization error is thrown and access is denied to
 *    non-admins.
 *
 * Note:
 *
 * - As no authentication or user role switching SDKs are provided, the test
 *   assumes that the given connection is not privileged as admin for the list
 *   access attempt. Only available SDKs and DTOs are used.
 * - Error assertion does not check message/type specifics; it only validates that
 *   an error occurs on forbidden access.
 */
export async function test_api_discussionBoard_test_list_all_members_permission_restriction(
  connection: api.IConnection,
) {
  // 1. Create a regular (non-admin) board member (prerequisite setup)
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: typia.random<string>(),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Attempt to access the admin-only board member listing (should fail for non-admin)
  await TestValidator.error("Non-admin cannot access board member list")(
    async () => {
      await api.functional.discussionBoard.admin.members.index(connection);
    },
  );
}
