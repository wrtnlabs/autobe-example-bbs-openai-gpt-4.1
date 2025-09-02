import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Validate creation of a moderation action with an invalid (non-existent)
 * target.
 *
 * This test ensures the system returns an error and does not persist any
 * moderation action when a moderator attempts to reference a non-existent
 * user, post, or comment as the moderation target. It checks each possible
 * target type separately.
 *
 * Steps:
 *
 * 1. Register as a moderator (with consent and random credentials).
 * 2. Attempt to create a moderation action using a fake user_id, post_id, or
 *    comment_id (using random valid UUIDs that cannot match real records).
 * 3. Confirm that each API call fails with an error, demonstrating robust
 *    backend reference validation.
 * 4. (If log retrieval were possible) Verify that no moderation action record
 *    is created; as only errors are observable, this is the limit of
 *    testability with given APIs.
 */
export async function test_api_moderation_action_creation_invalid_target(
  connection: api.IConnection,
) {
  // 1. Register moderator
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    consent: true,
    display_name: RandomGenerator.name(1),
  } satisfies IDiscussionBoardModerator.IJoin;

  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: joinInput,
  });
  typia.assert(moderatorAuth);

  // 2. Attempt to create moderation action with non-existent user_id
  const invalidActionUser = {
    moderator_id: moderatorAuth.moderator.id,
    user_id: typia.random<string & tags.Format<"uuid">>(),
    post_id: null,
    comment_id: null,
    action_type: RandomGenerator.pick([
      "warn",
      "mute",
      "remove",
      "edit",
      "restrict",
      "restore",
      "escalate",
    ] as const),
    action_reason: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  await TestValidator.error(
    "creating moderation action with invalid user_id should fail",
    async () => {
      await api.functional.discussionBoard.moderator.moderationActions.create(
        connection,
        { body: invalidActionUser },
      );
    },
  );

  // 3. Attempt to create moderation action with non-existent post_id
  const invalidActionPost = {
    moderator_id: moderatorAuth.moderator.id,
    user_id: null,
    post_id: typia.random<string & tags.Format<"uuid">>(),
    comment_id: null,
    action_type: RandomGenerator.pick([
      "warn",
      "mute",
      "remove",
      "edit",
      "restrict",
      "restore",
      "escalate",
    ] as const),
    action_reason: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  await TestValidator.error(
    "creating moderation action with invalid post_id should fail",
    async () => {
      await api.functional.discussionBoard.moderator.moderationActions.create(
        connection,
        { body: invalidActionPost },
      );
    },
  );

  // 4. Attempt to create moderation action with non-existent comment_id
  const invalidActionComment = {
    moderator_id: moderatorAuth.moderator.id,
    user_id: null,
    post_id: null,
    comment_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: RandomGenerator.pick([
      "warn",
      "mute",
      "remove",
      "edit",
      "restrict",
      "restore",
      "escalate",
    ] as const),
    action_reason: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 1 }),
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  await TestValidator.error(
    "creating moderation action with invalid comment_id should fail",
    async () => {
      await api.functional.discussionBoard.moderator.moderationActions.create(
        connection,
        { body: invalidActionComment },
      );
    },
  );
}
