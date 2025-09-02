import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Test that the API rejects creation of a moderation action with an invalid
 * action_type.
 *
 * Business context: Only platform-allowed moderation action types are
 * accepted. This test attempts to use an unsupported action_type and
 * expects the API to return a validation/business error, not create the
 * action.
 *
 * Steps:
 *
 * 1. Admin registers/joins to establish authentication context.
 * 2. Attempt to create a moderation action using an invalid action_type (not
 *    in allowed enum list).
 * 3. Verify the API produces an error (validation/business logic) for
 *    unsupported action_type.
 */
export async function test_api_admin_moderation_action_creation_with_invalid_action_type(
  connection: api.IConnection,
) {
  // 1. Establish admin authentication context.
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);
  const moderatorId: string & tags.Format<"uuid"> = adminJoin.admin.id;

  // 2. Attempt moderation action creation with unsupported action_type.
  // All fields except action_type are valid; action_type deliberately set wrong.
  await TestValidator.error(
    "rejects moderation action with unsupported action_type",
    async () => {
      await api.functional.discussionBoard.admin.moderationActions.create(
        connection,
        {
          body: {
            moderator_id: moderatorId,
            action_type: "permanently_ban" as any, // Deliberate: invalid string not among allowed enums. 'as any' only to bypass TS for E2E enum tests.
            action_reason: RandomGenerator.paragraph({ sentences: 3 }),
            effective_from: new Date().toISOString(),
          } as unknown as IDiscussionBoardModerationAction.ICreate, // As per E2E policy, only for negative enum validation.
        },
      );
    },
  );
}
