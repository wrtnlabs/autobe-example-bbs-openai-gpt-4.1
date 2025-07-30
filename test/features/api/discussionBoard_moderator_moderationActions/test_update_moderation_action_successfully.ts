import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Test successful update of a moderation action by a moderator.
 *
 * This test ensures that a moderator can update a moderation action's editable
 * fields (such as action_details) and that changes persist as expected.
 *
 * Steps:
 *
 * 1. Assign moderator role to a random user (admin privilege).
 * 2. Create a moderation action referencing the moderator as actor (admin
 *    privilege).
 * 3. As the moderator, update editable fields (e.g., action_details) of the
 *    moderation action.
 * 4. Verify that the response reflects the updates and other key fields remain
 *    unchanged.
 */
export async function test_api_discussionBoard_moderator_moderationActions_test_update_moderation_action_successfully(
  connection: api.IConnection,
) {
  // 1. Create a unique user_identifier for the moderator
  const user_identifier: string = RandomGenerator.alphaNumeric(16);

  // 2. Admin assigns moderator role to user
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(moderator);

  // 3. Admin creates a moderation action with the new moderator as actor
  const moderationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      {
        body: {
          actor_moderator_id: moderator.id,
          action_type: "warn",
          action_details: "Initial reason: spam detected.",
        },
      },
    );
  typia.assert(moderationAction);

  // 4. Moderator updates moderation action (e.g., change action_details)
  const updated_details = "Updated: further review, more context given.";
  const updatedAction =
    await api.functional.discussionBoard.moderator.moderationActions.update(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          action_details: updated_details,
        },
      },
    );
  typia.assert(updatedAction);

  // 5. Confirm the update is reflected and key fields persist
  TestValidator.equals("action_details updated")(updatedAction.action_details)(
    updated_details,
  );
  TestValidator.equals("actor_moderator_id remains")(
    updatedAction.actor_moderator_id,
  )(moderationAction.actor_moderator_id);
  TestValidator.equals("action_type remains")(updatedAction.action_type)(
    moderationAction.action_type,
  );
}
