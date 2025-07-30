import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful hard deletion of a membership record by admin.
 *
 * This test verifies the permanent deletion capability for admin membership
 * management in the discussion board system. Workflow:
 *
 * 1. Create a discussion board member (admin-only operation)
 * 2. Delete the created member using their id
 * 3. Validate that the member is fully removed (hard delete)
 *
 *    - Any attempt to delete the same member again should return not found
 *
 * Note: No GET or list endpoint is provided to double check disappearance; so,
 * confirmation is by double-delete error.
 */
export async function test_api_discussionBoard_test_delete_member_with_valid_member_id(
  connection: api.IConnection,
) {
  // 1. Create a new discussion board member for deletion test
  const user_identifier = RandomGenerator.alphabets(12);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Delete the created member by id
  await api.functional.discussionBoard.admin.members.erase(connection, {
    memberId: member.id,
  });

  // 3. Try to delete the same member again: should fail with not found error
  await TestValidator.error(
    "member hard deleted should not be deletable twice",
  )(async () => {
    await api.functional.discussionBoard.admin.members.erase(connection, {
      memberId: member.id,
    });
  });
}
