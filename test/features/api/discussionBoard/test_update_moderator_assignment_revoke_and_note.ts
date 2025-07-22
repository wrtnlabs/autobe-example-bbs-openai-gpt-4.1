import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate updating, revoking and error handling for moderator assignments as administrator.
 *
 * This test ensures an admin can update a moderator assignment (by ID), specifically to:
 *   - Set revoked_at to perform soft revocation
 *   - Attempt update on already-revoked moderator (expect error)
 *   - Attempt update for non-existent moderator (expect error)
 *
 * Steps:
 * 1. Create a new member
 * 2. Assign that member as a moderator (capture assignment ID)
 * 3. Revoke the assignment by setting revoked_at
 * 4. Validate the assignment is revoked (revoked_at is set)
 * 5. Attempt to revoke again (should fail)
 * 6. Attempt to update a fake/non-existent moderator assignment (should fail)
 */
export async function test_api_discussionBoard_test_update_moderator_assignment_revoke_and_note(
  connection: api.IConnection,
) {
  // 1. Create a new member
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(20),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Assign moderator role
  const moderator = await api.functional.discussionBoard.moderators.post(connection, {
    body: {
      member_id: member.id,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.equals("assignment target")(moderator.member_id)(member.id);
  TestValidator.equals("not revoked yet")(moderator.revoked_at)(null);

  // 3. Revoke moderator assignment (set revoked_at)
  const now = new Date().toISOString();
  const revokedAssignment = await api.functional.discussionBoard.moderators.putById(connection, {
    id: moderator.id,
    body: {
      revoked_at: now,
    } satisfies IDiscussionBoardModerator.IUpdate,
  });
  typia.assert(revokedAssignment);
  TestValidator.equals("ID unchanged")(revokedAssignment.id)(moderator.id);
  TestValidator.equals("proper revoked_at")(revokedAssignment.revoked_at)(now);

  // 4. Attempt to revoke again (should fail - already revoked)
  await TestValidator.error("cannot revoke already revoked moderator")(
    () => api.functional.discussionBoard.moderators.putById(connection, {
      id: moderator.id,
      body: {
        revoked_at: new Date().toISOString(),
      } satisfies IDiscussionBoardModerator.IUpdate,
    })
  );

  // 5. Attempt update for non-existent moderator (should fail)
  await TestValidator.error("cannot update non-existent moderator")(
    () => api.functional.discussionBoard.moderators.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: {
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.IUpdate,
    })
  );
}