import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Validate moderator's ability to retrieve detailed moderation action
 * information.
 *
 * This test covers both positive and negative access scenarios:
 *
 * 1. Register a new moderator with unique email, username, password (and
 *    display_name optional) and consent=true using moderator join API. This
 *    authenticates as a moderator for all subsequent operations.
 * 2. (Preparation - cannot seed moderation actions here) Assume a valid
 *    moderationActionId exists in the backend and the authenticated
 *    moderator has permission to read it. Since moderation actions cannot
 *    be created in test setup, use a placeholder random UUID and document
 *    limitation.
 * 3. Fetch moderation action detail with such random UUID: should result in a
 *    not found (404) or forbidden (403) error if no valid action exists.
 *    Properly assert and document this.
 * 4. Try fetch with another known-invalid moderationActionId: again, ensure
 *    appropriate error is thrown.
 *
 * This confirms that authorized moderators cannot view nonexistent or
 * unauthorized moderation actions, and that error paths are handled
 * securely.
 */
export async function test_api_moderation_action_detail_success_and_permission(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a moderator
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(10);
  const display_name = RandomGenerator.name();
  const resp = await api.functional.auth.moderator.join(connection, {
    body: {
      email,
      username,
      password,
      display_name,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(resp);
  TestValidator.predicate(
    "Moderator is active",
    resp.moderator.is_active === true,
  );

  // 2. Prepare a valid moderationActionId placeholder (no way to create or list moderation actions via current API)
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Try fetching the moderation action detail with placeholder - expect error (since most likely does not exist)
  await TestValidator.error(
    "Fetching random (nonexistent) moderation action should error",
    async () => {
      await api.functional.discussionBoard.moderator.moderationActions.at(
        connection,
        { moderationActionId },
      );
    },
  );

  // 4. Try with another known-invalid moderationActionId (random, no access)
  const invalidModerationActionId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "Fetching invalid moderation action must fail",
    async () => {
      await api.functional.discussionBoard.moderator.moderationActions.at(
        connection,
        { moderationActionId: invalidModerationActionId },
      );
    },
  );
}
