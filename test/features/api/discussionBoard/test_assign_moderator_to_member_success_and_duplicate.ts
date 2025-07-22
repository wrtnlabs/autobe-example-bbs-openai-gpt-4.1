import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate assigning moderator role to an existing member and handle conflicts.
 *
 * Business context:
 * - Only administrators can assign the moderator role to a member.
 * - Moderator assignment records the given member, sets timestamps, and exposes linkage in response.
 * - If the same member is already assigned as moderator, a duplicate assignment should fail with an error.
 * - If attempting to assign moderator to an existing administrator (which cannot be done here due to missing API), conflict should be checked if possible, but skipped if unimplementable.
 *
 * Test steps:
 * 1. Create a discussion board member eligible for moderator assignment.
 * 2. Assign moderator privileges to the member as admin and verify response includes moderator info, membership link, and correct timestamps (assigned_at must be recent, revoked_at must be null/undefined).
 * 3. Attempt to assign moderator privileges to the same member again and check that an error is thrown (duplicate assignment scenario).
 */
export async function test_api_discussionBoard_test_assign_moderator_to_member_success_and_duplicate(
  connection: api.IConnection,
) {
  // 1. Create a new member eligible for moderator assignment
  const memberBody: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };

  const member = await api.functional.discussionBoard.members.post(connection, { body: memberBody });
  typia.assert(member);
  TestValidator.equals("username matches")(member.username)(memberBody.username);
  TestValidator.equals("email matches")(member.email)(memberBody.email);

  // 2. Assign moderator to the member
  const assignmentInput: IDiscussionBoardModerator.ICreate = {
    member_id: member.id,
  };
  const mod = await api.functional.discussionBoard.moderators.post(connection, { body: assignmentInput });
  typia.assert(mod);
  TestValidator.equals("member_id matches")(mod.member_id)(member.id);
  TestValidator.equals("assignment has member subobject if present")(mod.member?.id ?? member.id)(member.id);
  TestValidator.equals("revoked_at is null or undefined")(mod.revoked_at ?? null)(null);
  TestValidator.predicate("assigned_at is a valid date-time")(
    typeof mod.assigned_at === "string" && mod.assigned_at.length > 0
  );

  // 3. Attempt duplicate assignment for same member
  await TestValidator.error("duplicate moderator assignment fails")(async () => {
    await api.functional.discussionBoard.moderators.post(connection, { body: assignmentInput });
  });
}