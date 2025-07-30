import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that only admins can create new discussion board members.
 *
 * This test validates the backend permission enforcement for the
 * /discussionBoard/admin/members endpoint.
 *
 * Steps:
 *
 * 1. Prepare realistic member registration input
 * 2. Attempt to create a new board member as a non-admin
 * 3. Confirm that the API blocks the operation with a permission/forbidden error
 *
 * This ensures that non-admin users cannot use the admin onboarding endpoint,
 * validating access control in the backend. No role switching/auth helpers or
 * unauthorized property invention is used—only what is supported by the given
 * SDK and type definitions.
 */
export async function test_api_discussionBoard_test_create_member_without_admin_permission(
  connection: api.IConnection,
) {
  // 1. Prepare new member data
  const createBody: IDiscussionBoardMember.ICreate = {
    user_identifier: typia.random<string>(),
    joined_at: new Date().toISOString(),
  };

  // 2. Attempt creation as non-admin & expect forbidden
  await TestValidator.error("non-admin should not create a member")(
    async () => {
      await api.functional.discussionBoard.admin.members.create(connection, {
        body: createBody,
      });
    },
  );
}
