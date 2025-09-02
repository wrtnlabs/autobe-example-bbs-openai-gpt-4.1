import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Test that unauthorized or unauthenticated users cannot create moderation
 * actions.
 *
 * This test attempts to call the moderation action creation endpoint
 * without registering as a moderator or logging in, expecting the API to
 * respond with an error indicating insufficient authorization (e.g., 401 or
 * 403).
 *
 * Steps:
 *
 * 1. Construct a connection with no authentication headers (simulating an
 *    unauthenticated user).
 * 2. Attempt to create a moderation action using random data for required
 *    fields (including a fabricated moderator_id).
 * 3. Assert that the response results in an error, specifically due to lack of
 *    authorization.
 * 4. Confirm that no moderation action was successfully created.
 */
export async function test_api_moderation_action_creation_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Prepare an unauthenticated connection (ensure no Authorization header is set)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 2: Attempt to create a moderation action with random valid input fields, but as unauthenticated.
  const randomAction: IDiscussionBoardModerationAction.ICreate = {
    moderator_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: RandomGenerator.pick([
      "warn",
      "mute",
      "remove",
      "edit",
      "restrict",
      "restore",
      "escalate",
    ] as const),
    action_reason: RandomGenerator.paragraph({ sentences: 2 }),
    effective_from: new Date().toISOString(),
  };

  // Step 3: Attempt the action and expect an authorization error
  await TestValidator.error(
    "unauthenticated user cannot create moderation action",
    async () => {
      await api.functional.discussionBoard.moderator.moderationActions.create(
        unauthConnection,
        {
          body: randomAction satisfies IDiscussionBoardModerationAction.ICreate,
        },
      );
    },
  );
}
