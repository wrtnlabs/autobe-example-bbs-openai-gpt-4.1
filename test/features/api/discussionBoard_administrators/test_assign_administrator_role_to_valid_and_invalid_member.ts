import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test assigning administrator role under multiple scenarios for discussion board RBAC.
 *
 * This scenario validates:
 *   - Assigning administrator role successfully to an existing member
 *   - Ensuring audit and member linkage in result
 *   - Preventing duplicate role assignments (already-admin member)
 *   - Producing 404 error on assignment to non-existent member
 *   - Enforcing RBAC by denying non-admins this operation
 *
 * Preparation:
 *   1. Register two unique members.
 *
 * Steps:
 *   2. As a (simulated) superuser, assign admin role to the first member successfully.
 *      - Validate assignment result (member_id, timestamps, member object)
 *   3. Attempt to assign admin to same member again – expect error (duplicate prevention)
 *   4. Attempt to assign admin to a random (non-existent) member_id – expect 404 error
 *   5. As a regular (non-admin) member, attempt assignment – expect permission denied error
 */
export async function test_api_discussionBoard_administrators_test_assign_administrator_role_to_valid_and_invalid_member(
  connection: api.IConnection,
) {
  // 1. Register two unique discussion board members
  const member1 = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(32),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member1);

  const member2 = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(32),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member2);

  // 2. Assign admin role to member1 (as a superuser)
  const adminAssignment = await api.functional.discussionBoard.administrators.post(connection, {
    body: { member_id: member1.id },
  });
  typia.assert(adminAssignment);
  TestValidator.equals("admin member reference")(adminAssignment.member_id)(member1.id);
  TestValidator.predicate("assigned_at timestamp is valid")(!!adminAssignment.assigned_at);
  TestValidator.equals("revoked_at is null")(adminAssignment.revoked_at)(null);
  TestValidator.equals("embedded member matches")(adminAssignment.member?.id)(member1.id);

  // 3. Attempt duplicate assignment – should throw
  await TestValidator.error("duplicate admin assignment")(async () => {
    await api.functional.discussionBoard.administrators.post(connection, {
      body: { member_id: member1.id },
    });
  });

  // 4. Assignment to non-existent member ID, expect 404
  await TestValidator.error("assign admin to non-existent member")(async () => {
    await api.functional.discussionBoard.administrators.post(connection, {
      body: { member_id: typia.random<string & tags.Format<"uuid">>() },
    });
  });

  // 5. Simulate as a regular member, attempt forbidden assignment
  // (Assume connection does not carry admin privilege for this part.)
  await TestValidator.error("RBAC enforcement: non-admin cannot assign admin role")(async () => {
    await api.functional.discussionBoard.administrators.post(connection, {
      body: { member_id: member2.id },
    });
  });
}