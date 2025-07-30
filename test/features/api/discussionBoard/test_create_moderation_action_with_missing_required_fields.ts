import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Validate that creation of a moderation action with missing required fields
 * fails.
 *
 * This test checks that the API enforces input validation for moderation
 * actions. Required fields include at least one actor (either moderator or
 * admin), an action_type, and a target reference (such as post_id, comment_id,
 * or report_id).
 *
 * Several malformed or incomplete requests are submitted:
 *
 * - Neither actor_moderator_id nor actor_admin_id supplied
 * - Both actor fields supplied but set to null
 * - Empty string passed for action_type (as omission is compile error)
 * - Missing all possible target references
 * - Only action_type present, omitting everything else
 *
 * The test ensures each results in a validation error (no record is created),
 * and that the API provides appropriate error feedback.
 *
 * Steps:
 *
 * 1. Create a moderator for valid actor reference (future cases)
 * 2. Try submitting without any actor fields (should fail)
 * 3. Submit with both actor fields set to null (should fail)
 * 4. Supply empty string for action_type (should fail)
 * 5. Omit all target references (should fail)
 * 6. Provide only action_type (should fail)
 */
export async function test_api_discussionBoard_test_create_moderation_action_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Prepare a valid moderator as dependency
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: typia.random<string>(),
        granted_at: new Date().toISOString(),
      },
    });
  typia.assert(moderator);

  // 2. No actor provided at all
  await TestValidator.error("should reject missing actor")(() =>
    api.functional.discussionBoard.admin.moderationActions.create(connection, {
      body: {
        action_type: "delete",
        post_id: typia.random<string & tags.Format<"uuid">>(),
      },
    }),
  );

  // 3. Both actor* fields are explicitly null
  await TestValidator.error("should reject both actors null")(() =>
    api.functional.discussionBoard.admin.moderationActions.create(connection, {
      body: {
        actor_moderator_id: null,
        actor_admin_id: null,
        action_type: "edit",
        post_id: typia.random<string & tags.Format<"uuid">>(),
      },
    }),
  );

  // 4. Empty string for action_type (required for compile, runtime invalid)
  await TestValidator.error("should reject empty action_type")(() =>
    api.functional.discussionBoard.admin.moderationActions.create(connection, {
      body: {
        actor_moderator_id: moderator.id,
        post_id: typia.random<string & tags.Format<"uuid">>(),
        action_type: "",
      },
    }),
  );

  // 5. No target reference (no post_id, comment_id, report_id but supply valid action_type and actor)
  await TestValidator.error("should reject without target reference")(() =>
    api.functional.discussionBoard.admin.moderationActions.create(connection, {
      body: {
        actor_moderator_id: moderator.id,
        action_type: "warn",
      },
    }),
  );

  // 6. Only action_type is supplied (no actors or targets)
  await TestValidator.error("should reject if only action_type is present")(
    () =>
      api.functional.discussionBoard.admin.moderationActions.create(
        connection,
        {
          body: {
            action_type: "ban",
          },
        },
      ),
  );
}
