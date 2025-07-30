import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate that non-admin users (such as regular members) cannot update another
 * member's record via the admin endpoint.
 *
 * Business Context: Only admin users are allowed to change sensitive
 * fields—such as user_identifier, join dates, or suspend/reactivate a
 * member—via /discussionBoard/admin/members/{memberId}. This test ensures that
 * privilege boundaries are enforced and that forbidden updates are denied,
 * preserving data and audit integrity.
 *
 * Steps:
 *
 * 1. As an admin, create a new board member (the target for the forbidden update).
 * 2. Simulate switching the connection/session/role to a non-admin user (by
 *    constructing a connection without the Authorization header).
 * 3. Attempt to update the target member's record with new data.
 * 4. Assert that the API call fails with a permission-denied error (using
 *    TestValidator.error).
 */
export async function test_api_discussionBoard_test_update_member_with_unauthorized_role(
  connection: api.IConnection,
) {
  // 1. As admin, provision a member as the update target
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphabets(8),
    joined_at: new Date().toISOString(),
  };
  const target: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: memberInput,
    });
  typia.assert(target);

  // 2. Simulate switching to a non-admin/unauthenticated user by omitting the Authorization header
  const { Authorization, ...restHeaders } = connection.headers ?? {};
  const nonAdminConnection: api.IConnection = {
    ...connection,
    headers: restHeaders,
  };

  // 3. Attempt forbidden update as non-admin
  const updateInput: IDiscussionBoardMember.IUpdate = {
    suspended_at: new Date().toISOString(),
  };

  await TestValidator.error("permission denied for non-admin member update")(
    async () => {
      await api.functional.discussionBoard.admin.members.update(
        nonAdminConnection,
        {
          memberId: target.id,
          body: updateInput,
        },
      );
    },
  );
}
