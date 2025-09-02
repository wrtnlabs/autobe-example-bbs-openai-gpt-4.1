import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Verify the /discussionBoard/admin/moderationActions endpoint enforces
 * required field validation by rejecting requests missing a mandatory
 * property.
 *
 * This test ensures that attempts to create a moderation action without a
 * required field ('moderator_id') result in a validation error and no
 * resource creation.
 *
 * Steps:
 *
 * 1. Register a new admin using /auth/admin/join (establishes admin role).
 * 2. Attempt to create a moderation action but deliberately omit the
 *    'moderator_id' field.
 * 3. Assert the API rejects the request with a descriptive validation error,
 *    fulfilling schema compliance and robustness requirements.
 * 4. The test does not check resource persistence since resource listing is
 *    unavailable, but confirms proper enforcement of business rules at the
 *    API boundary.
 */
export async function test_api_admin_moderation_action_creation_missing_required_field(
  connection: api.IConnection,
) {
  // 1. Register as a new admin (setup authentication)
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUserId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Construct invalid moderation action input (missing 'moderator_id')
  const invalidAction = {
    // 'moderator_id' is missing on purpose
    action_type: "warn",
    action_reason: RandomGenerator.paragraph({ sentences: 3 }),
    effective_from: new Date().toISOString(),
  } as Partial<IDiscussionBoardModerationAction.ICreate>;

  // 3. Attempt to create moderation action and expect validation error
  await TestValidator.error(
    "API rejects moderation action missing 'moderator_id'",
    async () => {
      await api.functional.discussionBoard.admin.moderationActions.create(
        connection,
        {
          body: invalidAction as IDiscussionBoardModerationAction.ICreate,
        },
      );
    },
  );
}
