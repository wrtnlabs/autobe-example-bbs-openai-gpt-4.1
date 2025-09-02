import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * E2E test: update an existing moderation action as admin.
 *
 * 1. Register and authenticate as admin (using join endpoint).
 * 2. Create a moderation action (for a random target, e.g. post or user).
 * 3. Update selected fields (action_reason, details, effective_until, etc.)
 *    using the update endpoint.
 * 4. Validate all updated fields are changed correctly, non-updated fields are
 *    untouched, and audit/compliance fields (updated_at) appear to change
 *    appropriately.
 * 5. Ensure all API responses strictly follow their type signatures.
 * 6. Confirm that only permitted fields are changed (attempting more is out of
 *    scope for this positive-path test).
 */
export async function test_api_admin_moderation_action_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const userId: string = typia.random<string & tags.Format<"uuid">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: { user_id: userId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);
  const admin = adminJoin.admin;

  // 2. Create a moderation action as admin, targeting user (could also target post/comment)
  const moderationCreatePayload: IDiscussionBoardModerationAction.ICreate = {
    moderator_id: admin.id,
    user_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: "warn",
    action_reason: RandomGenerator.paragraph({ sentences: 4 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
    effective_from: new Date().toISOString(),
  };
  const moderationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      {
        body: moderationCreatePayload,
      },
    );
  typia.assert(moderationAction);

  // 3. Update moderation action
  const updateData: IDiscussionBoardModerationAction.IUpdate = {
    action_type: "restrict",
    action_reason: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 1 }),
    effective_until: new Date(Date.now() + 86400000).toISOString(), // +1 day
  };
  const updated =
    await api.functional.discussionBoard.admin.moderationActions.update(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: updateData,
      },
    );
  typia.assert(updated);

  // 4. Validate changes: updated fields match input, untouched fields remain, updated_at advances
  TestValidator.equals(
    "moderation id matches",
    updated.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "action_type updated",
    updated.action_type,
    updateData.action_type,
  );
  TestValidator.equals(
    "action_reason updated",
    updated.action_reason,
    updateData.action_reason,
  );
  TestValidator.equals("details updated", updated.details, updateData.details);
  TestValidator.equals(
    "effective_until updated",
    updated.effective_until,
    updateData.effective_until,
  );

  // Fields that should remain unchanged
  TestValidator.equals(
    "moderator_id untouched",
    updated.moderator_id,
    moderationAction.moderator_id,
  );
  TestValidator.equals(
    "user_id untouched",
    updated.user_id,
    moderationAction.user_id,
  );
  TestValidator.equals(
    "post_id untouched",
    updated.post_id,
    moderationAction.post_id,
  );
  TestValidator.equals(
    "comment_id untouched",
    updated.comment_id,
    moderationAction.comment_id,
  );
  TestValidator.equals(
    "effective_from untouched",
    updated.effective_from,
    moderationAction.effective_from,
  );
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    moderationAction.created_at,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updated.deleted_at,
    moderationAction.deleted_at,
  );

  // Validate business expectation: updated_at must change
  TestValidator.predicate(
    "updated_at has changed",
    updated.updated_at !== moderationAction.updated_at,
  );
}
