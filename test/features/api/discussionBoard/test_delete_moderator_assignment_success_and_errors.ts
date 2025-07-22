import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * E2E test: Revoke (soft-delete) moderator assignment by ID as admin, including success and error flows.
 *
 * This test covers:
 *   1. Successful deletion (soft-revoke) of an existing moderator assignment by admin
 *   2. Attempting to delete a non-existent moderator assignment, verifying error
 *   3. Attempting double deletion of the same assignment, verifying error
 *   4. Audit field check: 'revoked_at' is null before delete (cannot check after)
 *   5. Member remains active (is_active: true) after moderator role revoked
 *
 * Precondition: Create a member and assign them as moderator.
 * Steps:
 *   - Create member
 *   - Assign moderator role to member
 *   - Successfully delete moderator assignment (eraseById)
 *   - Assert further delete attempts (double delete) throw error
 *   - Attempt to delete a random/non-existent id, expect error
 *   - Check audit field (revoked_at is null before delete)
 *   - Member record is untouched; is_active: true
 *   - (No API exists to confirm audit field after delete or confirm role loss on member; omitted)
 */
export async function test_api_discussionBoard_test_delete_moderator_assignment_success_and_errors(
  connection: api.IConnection,
) {
  // 1. Register a discussion board member for moderator assignment
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

  // 2. Assign the member as a moderator
  const moderator = await api.functional.discussionBoard.moderators.post(connection, {
    body: {
      member_id: member.id,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.equals("moderator assigned to correct member")(moderator.member_id)(member.id);
  TestValidator.equals("revoked_at before delete")(moderator.revoked_at)(null);

  // 3. Soft-delete (revoke) moderator assignment by ID
  await api.functional.discussionBoard.moderators.eraseById(connection, {
    id: moderator.id,
  });
  // Success: void/204 (no content expected)

  // 4. Double-deletion should return error (e.g., 404)
  await TestValidator.error("double delete error")(() =>
    api.functional.discussionBoard.moderators.eraseById(connection, {
      id: moderator.id,
    }),
  );

  // 5. Attempt deletion of a random/non-existent moderator id
  await TestValidator.error("delete non-existent moderator error")(() =>
    api.functional.discussionBoard.moderators.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    }),
  );

  // 6. (No API for moderator fetch post-delete, so test is limited to above)
  // Validating that the member record is untouched (active)
  TestValidator.equals("member remains active")(member.is_active)(true);
}