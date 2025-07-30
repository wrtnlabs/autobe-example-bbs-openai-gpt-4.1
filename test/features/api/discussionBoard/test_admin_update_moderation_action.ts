import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Test that an admin is able to update a moderation action record and the
 * changes are correctly reflected.
 *
 * Business context: Platform admins need to maintain accurate moderation action
 * logs, including correcting any mistakes in previous action notes or
 * resolution comments for audit, compliance, and investigation purposes.
 *
 * Steps:
 *
 * 1. Create a new discussion board admin (simulates the admin making moderation
 *    changes).
 * 2. Create a moderation action using that admin as the actor (to update later).
 * 3. Update the moderation action's details (e.g., update action_details or
 *    action_type).
 * 4. Validate the updated moderation action response reflects the new details and
 *    expected audit info. (Immutable fields like created_at, id must not
 *    change; only allowed fields are updated.)
 * 5. (Negative test) Attempt to update a non-existent moderation action (should
 *    error).
 */
export async function test_api_discussionBoard_test_admin_update_moderation_action(
  connection: api.IConnection,
) {
  // 1. Create an admin who will perform the action
  const adminUserIdentifier: string = RandomGenerator.alphabets(10);
  const now: string = new Date().toISOString();
  const createdAdmin: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.admins.create(connection, {
      body: {
        user_identifier: adminUserIdentifier,
        granted_at: now,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // 2. Create a moderation action as that admin
  const actionType = "warn";
  const originalDetails = "Initial action note by admin";
  const createdAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      {
        body: {
          actor_admin_id: createdAdmin.id,
          action_type: actionType,
          action_details: originalDetails,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(createdAction);

  // 3. Update the moderation action's details
  const newDetails = "Updated action note after review.";
  const updatedAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.admin.moderationActions.update(
      connection,
      {
        moderationActionId: createdAction.id,
        body: {
          action_details: newDetails,
        } satisfies IDiscussionBoardModerationAction.IUpdate,
      },
    );
  typia.assert(updatedAction);

  // 4. Validate update
  TestValidator.equals("id remains the same")(updatedAction.id)(
    createdAction.id,
  );
  TestValidator.equals("actor_admin_id unchanged")(
    updatedAction.actor_admin_id,
  )(createdAdmin.id);
  TestValidator.notEquals("action_details updated")(
    updatedAction.action_details,
  )(createdAction.action_details);
  TestValidator.equals("action_details matches update")(
    updatedAction.action_details,
  )(newDetails);
  TestValidator.equals("action_type unchanged")(updatedAction.action_type)(
    actionType,
  );
  TestValidator.equals("created_at unchanged")(updatedAction.created_at)(
    createdAction.created_at,
  );

  // 5. Negative test: Attempt to update a non-existent moderation action (should error)
  await TestValidator.error("updating unknown moderation action throws error")(
    async () => {
      await api.functional.discussionBoard.admin.moderationActions.update(
        connection,
        {
          moderationActionId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            action_details: "should not succeed",
          } satisfies IDiscussionBoardModerationAction.IUpdate,
        },
      );
    },
  );
}
