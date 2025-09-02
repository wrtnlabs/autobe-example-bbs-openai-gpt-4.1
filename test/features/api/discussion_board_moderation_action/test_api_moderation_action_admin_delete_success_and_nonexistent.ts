import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * E2E test for successful soft deletion (retirement) of a moderation action
 * by an admin and correct error handling for non-existent or
 * previously-deleted moderation actions.
 *
 * Steps:
 *
 * 1. Create and authenticate an admin via admin join (provides moderator_id
 *    context)
 * 2. Create a moderation action as the authenticated admin
 * 3. Perform soft-delete (retire) using the moderation action's id. Verify
 *    'deleted_at' is set
 * 4. Attempt to delete the same moderation action again: expect error or
 *    idempotent result
 * 5. Attempt to delete a random, non-existent moderation action id: expect
 *    not-found error
 */
export async function test_api_moderation_action_admin_delete_success_and_nonexistent(
  connection: api.IConnection,
) {
  // 1. Create admin and authenticate (join sets connection.headers automatically)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);
  const adminId: string & tags.Format<"uuid"> = adminJoin.admin.id;

  // 2. Create a moderation action as this admin
  const moderationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      {
        body: {
          moderator_id: adminId,
          user_id: typia.random<string & tags.Format<"uuid">>(),
          action_type: "remove",
          action_reason: RandomGenerator.paragraph({ sentences: 2 }),
          effective_from: new Date().toISOString(),
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);
  const moderationActionId: string & tags.Format<"uuid"> = moderationAction.id;

  // 3. Delete (retire) the moderation action, and assert 'deleted_at' is set
  const deletedAction =
    await api.functional.discussionBoard.admin.moderationActions.erase(
      connection,
      {
        moderationActionId,
      },
    );
  typia.assert(deletedAction);
  TestValidator.predicate(
    "deleted_at should be set after retirement",
    deletedAction.deleted_at !== null && deletedAction.deleted_at !== undefined,
  );

  // 4. Attempt to delete again - expect error or idempotent no-op (deleted_at remains set)
  await TestValidator.error(
    "deleting already-retired moderation action should fail or be idempotent",
    async () => {
      await api.functional.discussionBoard.admin.moderationActions.erase(
        connection,
        {
          moderationActionId,
        },
      );
    },
  );

  // 5. Attempt to delete non-existent id - expect not-found error
  const randomUuid: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "deleting non-existent moderation action should result in not-found error",
    async () => {
      await api.functional.discussionBoard.admin.moderationActions.erase(
        connection,
        {
          moderationActionId: randomUuid,
        },
      );
    },
  );
}
