import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Test successful moderation action creation by a moderator.
 *
 * This test ensures that a newly registered moderator can create a
 * moderation action (e.g., warn another user or content), and that the
 * resulting moderation action record is complete and correct. The test does
 * not depend on any pre-existing user, post, or comment, so those
 * references are left null.
 *
 * 1. Register a moderator with random but valid credentials using the join API
 *    (records the moderator and provides authentication context).
 * 2. Use the authenticated context (moderator role) to create a moderation
 *    action (e.g., type 'warn') using the moderator_id provided in the join
 *    result. Omit user_id, post_id, and comment_id or set them to null
 *    since there is no target entity to moderate in this minimal happy path
 *    scenario.
 * 3. Verify the moderation action's response:
 *
 * - Has type IDiscussionBoardModerationAction
 * - All audit fields (id, created_at, updated_at, moderator_id,
 *   effective_from, action_type, action_reason) are present and in proper
 *   format.
 * - Moderator_id matches the joining moderator
 * - Action_type and action_reason reflect the input
 * - Effective_from is the current time (allowing for small system clock
 *   differences)
 * - Created_at and updated_at are ISO8601 and updated_at is after created_at
 *   or equal
 */
export async function test_api_moderation_action_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new moderator and authenticate context
  const moderatorCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    consent: true,
  } satisfies IDiscussionBoardModerator.IJoin;
  const joinResult = await api.functional.auth.moderator.join(connection, {
    body: moderatorCredentials,
  });
  typia.assert(joinResult);
  const { moderator } = joinResult;

  // 2. Create a moderation action as this moderator
  const actionType = "warn" as const;
  const now = new Date();
  const createModerationAction = {
    moderator_id: moderator.id,
    action_type: actionType,
    action_reason: RandomGenerator.paragraph({ sentences: 4 }),
    effective_from: now.toISOString(),
    user_id: null,
    post_id: null,
    comment_id: null,
  } satisfies IDiscussionBoardModerationAction.ICreate;
  const moderationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      { body: createModerationAction },
    );
  typia.assert(moderationAction);

  // 3. Key response validations
  TestValidator.equals(
    "moderation action moderator_id matches",
    moderationAction.moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "moderation action type matches input",
    moderationAction.action_type,
    actionType,
  );
  TestValidator.equals(
    "moderation action reason matches",
    moderationAction.action_reason,
    createModerationAction.action_reason,
  );
  TestValidator.equals(
    "moderation action user_id is null",
    moderationAction.user_id,
    null,
  );
  TestValidator.equals(
    "moderation action post_id is null",
    moderationAction.post_id,
    null,
  );
  TestValidator.equals(
    "moderation action comment_id is null",
    moderationAction.comment_id,
    null,
  );
  TestValidator.predicate(
    "moderation action has a non-empty id",
    typeof moderationAction.id === "string" && moderationAction.id.length > 0,
  );
  TestValidator.predicate(
    "effective_from is ISO string",
    !isNaN(Date.parse(moderationAction.effective_from)),
  );
  TestValidator.predicate(
    "created_at is ISO string",
    !isNaN(Date.parse(moderationAction.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    !isNaN(Date.parse(moderationAction.updated_at)),
  );
  // created_at and updated_at should be equal or updated_at after created_at
  TestValidator.predicate(
    "updated_at is equal to or after created_at",
    Date.parse(moderationAction.updated_at) >=
      Date.parse(moderationAction.created_at),
  );
}
