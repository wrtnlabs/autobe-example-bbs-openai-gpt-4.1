import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Validate administrator assignment update (revoke/reactivate) logic for the discussion board system.
 *
 * Business context:
 * Only administrators can update (revoke/reactivate) administrator assignments. Revoking privileges sets revoked_at and disables RBAC privileges. All update attempts (including errors) must be strictly audit logged. The assignment must remain properly linked to the member. Attempts to update an already revoked or non-existent assignment must fail.
 *
 * Steps:
 * 1. Create a member account to assign admin rights
 * 2. Assign administrator privileges to the member
 * 3. Update the administrator assignment to revoke privileges (set revoked_at)
 * 4. Validate the assignment is revoked, revoked_at set, member link intact
 * 5. Attempt to update the revoked assignment (should error)
 * 6. Attempt to update a non-existent assignment (should error)
 * 7. Confirm assignment linkage persists after revocation and privileges are removed
 */
export async function test_api_discussionBoard_administrators_test_update_administrator_assignment_status_and_notes(
  connection: api.IConnection,
) {
  // 1. Create a new member to assign administrator privileges
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Assign administrator privileges to the member
  const assignment = await api.functional.discussionBoard.administrators.post(connection, {
    body: {
      member_id: member.id,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(assignment);

  // 3. Update: Revoke administrator rights by setting revoked_at
  const revocationTime = new Date().toISOString();
  const revokedAssignment = await api.functional.discussionBoard.administrators.putById(connection, {
    id: assignment.id,
    body: { revoked_at: revocationTime } satisfies IDiscussionBoardAdministrator.IUpdate,
  });
  typia.assert(revokedAssignment);

  // 4. Confirm revoked_at is set, and assignment still links to member
  TestValidator.equals("revoked_at is set")(revokedAssignment.revoked_at)(revocationTime);
  TestValidator.equals("assignment links member")(revokedAssignment.member_id)(member.id);

  // 5. Attempt to revoke again (already revoked) -- should error
  await TestValidator.error("revoking already revoked assignment fails")(() =>
    api.functional.discussionBoard.administrators.putById(connection, {
      id: assignment.id,
      body: { revoked_at: new Date().toISOString() } satisfies IDiscussionBoardAdministrator.IUpdate,
    })
  );

  // 6. Attempt to update a non-existent assignment -- should error
  await TestValidator.error("updating non-existent assignment fails")(() =>
    api.functional.discussionBoard.administrators.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: { revoked_at: new Date().toISOString() } satisfies IDiscussionBoardAdministrator.IUpdate,
    })
  );

  // 7. Confirm member linkage and privilege revoked after assignment update
  TestValidator.equals("assignment linkage after revoke")(revokedAssignment.member_id)(member.id);
  TestValidator.predicate("assignment is revoked")(!!revokedAssignment.revoked_at);
}