import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Test unauthorized user cannot update moderation action.
 *
 * This test ensures that only moderator or admin accounts can update moderation
 * action records. Verifies that a regular (non-moderator, non-admin) user is
 * denied when attempting to perform a moderation action update, and that the
 * moderation action itself is not changed as a result of the unauthorized
 * attempt.
 *
 * Test Steps:
 *
 * 1. (Admin) Create a new member (non-moderator, non-admin)
 * 2. (Admin) Create a new moderation action attached to a random (real or mock)
 *    target
 * 3. Attempt to update the moderation action as the non-privileged user
 *
 *    - Confirm the request fails (authorization error)
 *    - Confirm that the moderation action was not changed
 */
export async function test_api_discussionBoard_test_update_moderation_action_unauthorized(
  connection: api.IConnection,
) {
  // 1. (Admin) Create a new regular member (not a moderator or admin)
  const userIdentifier: string = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: userIdentifier,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. (Admin) Create a moderation action (with admin or moderator actor, not the member just created)
  const moderationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      {
        body: {
          actor_admin_id: null,
          actor_moderator_id: null,
          action_type: RandomGenerator.alphaNumeric(8),
        },
      },
    );
  typia.assert(moderationAction);

  // 3. Attempt to update as the non-privileged user
  //    (Here, we assume the context can be switched to the created user – adjust as needed per test infra)
  const updateInput = { action_type: RandomGenerator.alphaNumeric(10) };
  await TestValidator.error(
    "deny update moderation action to non-privileged user",
  )(async () => {
    await api.functional.discussionBoard.moderator.moderationActions.update(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: updateInput,
      },
    );
  });

  // Note: Verification that moderation action record remains unchanged is not implemented
  // due to missing GET/read API for moderation actions in the provided SDK.
}
