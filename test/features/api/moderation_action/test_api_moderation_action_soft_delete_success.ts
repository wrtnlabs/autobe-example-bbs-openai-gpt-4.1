import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * E2E test: Soft-deleting (retiring) a moderation action as a moderator.
 *
 * This function tests the full business flow for retiring (soft-deleting) a
 * moderation action record. It exercises core compliance and audit
 * requirements:
 *
 * 1. Register as a new moderator, generating a unique account with proper
 *    authorization.
 * 2. Authenticate and create a new moderation action as that moderator.
 * 3. Issue the soft delete (retire) API call against the created moderation
 *    action.
 * 4. Validate that the moderation action now carries a deleted_at timestamp.
 * 5. Confirm the deleted action is, per business logic, auditable (i.e., still
 *    retrievable by privileged paths if business API allows).
 * 6. Ensure the API response semantics: The action isn't physically deleted,
 *    and audit/retention policy is upheld.
 */
export async function test_api_moderation_action_soft_delete_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator and store the authorization context for subsequent privileged actions.
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const username = RandomGenerator.name(1);

  // Join as moderator; retains credentials and token in connection headers.
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email,
      password,
      username,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  const moderator = moderatorAuth.moderator;

  // Step 2: Create a new moderation action as that moderator
  const now = new Date().toISOString();
  const actionInput = {
    moderator_id: moderator.id,
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
    details: RandomGenerator.paragraph(),
    effective_from: now,
    // Optional targets left null for generic coverage
    user_id: null,
    post_id: null,
    comment_id: null,
    effective_until: null,
  } satisfies IDiscussionBoardModerationAction.ICreate;
  const moderationAction =
    await api.functional.discussionBoard.moderator.moderationActions.create(
      connection,
      { body: actionInput },
    );
  typia.assert(moderationAction);

  // Step 3: Soft-delete (retire) the moderation action via API.
  const deleted =
    await api.functional.discussionBoard.moderator.moderationActions.erase(
      connection,
      {
        moderationActionId: moderationAction.id,
      },
    );
  typia.assert(deleted);

  // Step 4: Validate soft-deletion (deleted_at field is now set, not null/undefined)
  TestValidator.predicate(
    "deleted_at is set after soft deletion",
    deleted.deleted_at !== null && deleted.deleted_at !== undefined,
  );
  TestValidator.equals(
    "deleted action id remains unchanged",
    deleted.id,
    moderationAction.id,
  );

  // (Step 5: Validate audit retention business rule if audit APIs were available, but not directly testable with current SDK surface)

  // Step 6: Optionally, check if re-deleting fails, or lookup behavior changes (not implemented as untestable here).
}
