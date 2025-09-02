import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Test updating an existing moderation action by a moderator and verify
 * success.
 *
 * Workflow:
 *
 * 1. Register and authenticate as a moderator.
 * 2. Create a moderation action (for example, a mute or restriction) with
 *    random, valid data.
 * 3. Update the moderation action using the update endpoint, changing only
 *    allowed fields (e.g., effective_until, action_reason, details).
 * 4. Assert the update response - changed fields reflect new values, immutable
 *    fields remain the same, and updated_at timestamp changes.
 * 5. Assert type correctness, and business rule compliance (only allowed
 *    fields changed).
 */
export async function test_api_moderation_action_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a moderator
  const joinInput: IDiscussionBoardModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    consent: true,
    display_name: RandomGenerator.name(),
  };
  const auth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: joinInput });
  typia.assert(auth);
  const moderatorId: string & tags.Format<"uuid"> = auth.moderator.id;

  // 2. Create a moderation action
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // +7 days
  const originalActionInput: IDiscussionBoardModerationAction.ICreate = {
    moderator_id: moderatorId,
    action_type: RandomGenerator.pick(["warn", "mute", "restrict"] as const),
    action_reason: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
    // No user_id, post_id, comment_id for simplicity (test pure moderator action flow)
  };
  const originalAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      { body: originalActionInput },
    );
  typia.assert(originalAction);

  // 3. Update the moderation action (change reason, details, extend effective_until)
  const updatedReason = RandomGenerator.paragraph({ sentences: 4 });
  const updatedDetails = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 7,
    wordMin: 3,
    wordMax: 7,
  });
  const extendedUntil = new Date(
    now.getTime() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString(); // +14 days

  const updateBody: IDiscussionBoardModerationAction.IUpdate = {
    action_reason: updatedReason,
    details: updatedDetails,
    effective_until: extendedUntil,
  };
  const updatedAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderationActions.update(
      connection,
      {
        moderationActionId: originalAction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAction);

  // 4. Verify updated values and audit trail
  TestValidator.equals(
    "action id is unchanged",
    updatedAction.id,
    originalAction.id,
  );
  TestValidator.equals(
    "moderator id is unchanged",
    updatedAction.moderator_id,
    moderatorId,
  );
  TestValidator.notEquals(
    "updated_at timestamp must change after update",
    updatedAction.updated_at,
    originalAction.updated_at,
  );
  TestValidator.equals(
    "updated action_reason is applied",
    updatedAction.action_reason,
    updatedReason,
  );
  TestValidator.equals(
    "updated details is applied",
    updatedAction.details,
    updatedDetails,
  );
  TestValidator.equals(
    "effective_until is extended",
    updatedAction.effective_until,
    extendedUntil,
  );
  TestValidator.equals(
    "effective_from must remain the same if not updated",
    updatedAction.effective_from,
    originalAction.effective_from,
  );
  TestValidator.equals(
    "created_at instant is unchanged",
    updatedAction.created_at,
    originalAction.created_at,
  );

  // 5. Assert only allowed fields are updated (business rule compliance)
  TestValidator.equals(
    "immutable fields unchanged: post_id",
    updatedAction.post_id,
    originalAction.post_id,
  );
  TestValidator.equals(
    "immutable fields unchanged: comment_id",
    updatedAction.comment_id,
    originalAction.comment_id,
  );
  TestValidator.equals(
    "immutable fields unchanged: user_id",
    updatedAction.user_id,
    originalAction.user_id,
  );
  TestValidator.equals(
    "immutable fields unchanged: action_type",
    updatedAction.action_type,
    originalAction.action_type,
  );
}
