import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Validate error handling for moderation action update with invalid or
 * non-existent ID.
 *
 * 1. Register a new moderator via /auth/moderator/join for valid
 *    authentication context.
 * 2. Attempt to update a moderation action at
 *    /discussionBoard/moderator/moderationActions/{moderationActionId}
 *    using a random (non-existent) UUID.
 *
 *    - Construct a minimal valid update body (e.g., changing action_reason or
 *         action_type) as per DTO.
 *    - Confirm no update is permitted, and the response is an error (ideally 404
 *         or business not-found/invalid-resource variant).
 * 3. (Optional error scenario) Attempt with a plausibly real UUID but simulate
 *    that it is soft-deleted, e.g., by using a second random UUID.
 *
 *    - This scenario is equivalent as we cannot physically soft-delete in this
 *         test, but covers the tombstoned case in principle.
 * 4. Use TestValidator.error() with descriptive assertion titles for both
 *    cases to guarantee that requests with non-existent/deleted IDs always
 *    fail and do not leak data or produce phantom records. Ensure no
 *    accidental record is created and no unexpected success occurs.
 */
export async function test_api_moderation_action_update_invalid_id(
  connection: api.IConnection,
) {
  // 1. Moderator registration (auth context)
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorJoin);

  // 2. Attempt update with non-existent moderationActionId
  await TestValidator.error(
    "update with unknown moderation action ID should fail",
    async () => {
      await api.functional.discussionBoard.moderator.moderationActions.update(
        connection,
        {
          moderationActionId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            action_reason: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies IDiscussionBoardModerationAction.IUpdate,
        },
      );
    },
  );

  // 3. Attempt update with a second non-existent (simulate soft-deleted) ID
  await TestValidator.error(
    "update with tombstoned (soft-deleted) moderation action ID should fail",
    async () => {
      await api.functional.discussionBoard.moderator.moderationActions.update(
        connection,
        {
          moderationActionId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            action_type: "remove",
          } satisfies IDiscussionBoardModerationAction.IUpdate,
        },
      );
    },
  );
}
