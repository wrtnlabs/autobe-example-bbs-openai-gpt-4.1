import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test creating a member and verify unique user_identifier constraint
 * enforcement.
 *
 * This function tests whether the discussion board admin members API correctly
 * enforces the uniqueness constraint on the 'user_identifier' property.
 *
 * Step-by-step process:
 *
 * 1. Create an initial member with a unique 'user_identifier' and 'joined_at'.
 * 2. Attempt to create a second member with the exact same 'user_identifier' but a
 *    different 'joined_at'.
 * 3. The second creation attempt should throw an error due to the unique
 *    constraint violation.
 * 4. If the error is not thrown, the test fails.
 */
export async function test_api_discussionBoard_admin_members_test_create_member_duplicate_user_identifier(
  connection: api.IConnection,
) {
  // 1. Create the initial member with a unique user_identifier
  const memberInput = {
    user_identifier: RandomGenerator.alphaNumeric(16),
    joined_at: new Date().toISOString(),
  } satisfies IDiscussionBoardMember.ICreate;
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: memberInput,
    },
  );
  typia.assert(member);
  TestValidator.equals("user_identifier matches")(member.user_identifier)(
    memberInput.user_identifier,
  );

  // 2. Attempt to create another member with the same user_identifier but different joined_at
  await TestValidator.error("duplicate user_identifier should be rejected")(
    async () => {
      await api.functional.discussionBoard.admin.members.create(connection, {
        body: {
          user_identifier: memberInput.user_identifier,
          joined_at: new Date(Date.now() + 1000).toISOString(),
        } satisfies IDiscussionBoardMember.ICreate,
      });
    },
  );
}
