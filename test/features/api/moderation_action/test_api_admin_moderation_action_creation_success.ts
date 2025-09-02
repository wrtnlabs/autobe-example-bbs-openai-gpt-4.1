import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * E2E test: verify successful creation of a moderation action (e.g.,
 * restrict a user) via the admin endpoint.
 *
 * This test validates that a platform admin can register (using
 * /auth/admin/join), then submit a new moderation action (POST
 * /discussionBoard/admin/moderationActions) targeting a user. The
 * moderation action must be successfully created, compliance and trace
 * fields must be populated, and response values must match business and
 * schema expectations.
 *
 * Steps:
 *
 * 1. Generate a random user_id (simulated, since no user-create endpoint is
 *    available in scope).
 * 2. Register a new admin via api.functional.auth.admin.join, saving admin
 *    record and authentication context.
 * 3. Prepare an IDiscussionBoardModerationAction.ICreate struct:
 *
 *    - Moderator_id = created admin's id
 *    - User_id = generated above
 *    - Action_type = valid enum (e.g., restrict)
 *    - Action_reason = realistic, short audit reason
 *    - Details = (optional, but set for richer audit trail)
 *    - Effective_from = current date-time
 *    - Effective_until = set to a short interval after effective_from for
 *         demonstration
 * 4. Create the moderation action via
 *    api.functional.discussionBoard.admin.moderationActions.create.
 * 5. Assert returned IDiscussionBoardModerationAction has:
 *
 *    - Id, created_at, updated_at, moderator_id, and user_id fields
 *    - Fields match the submission (moderator_id, user_id, action_type, reason,
 *         etc.)
 *    - Proper compliance: all required fields, audit-traceable properties set,
 *         types correct
 * 6. Validate type safety with typia.assert, verify moderation action links to
 *    submitting admin, and that system audit fields are non-empty.
 */
export async function test_api_admin_moderation_action_creation_success(
  connection: api.IConnection,
) {
  // 1. Simulate a random user_id for the affected party (since user creation is out of scope)
  const affectedUserId = typia.random<string & tags.Format<"uuid">>();

  // 2. Register a new admin and authenticate
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuth);
  const moderatorId = adminAuth.admin.id;

  // 3. Prepare moderation action create input
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour
  const moderationInput = {
    moderator_id: moderatorId,
    user_id: affectedUserId,
    post_id: null,
    comment_id: null,
    action_type: "restrict",
    action_reason: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 8,
      wordMax: 16,
    }),
    details: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 12,
    }),
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  // 4. Create moderation action
  const moderationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      {
        body: moderationInput,
      },
    );
  typia.assert(moderationAction);

  // 5. Assertions: returned fields and compliance
  TestValidator.predicate(
    "response id is present",
    typeof moderationAction.id === "string" && moderationAction.id.length > 0,
  );
  TestValidator.equals(
    "moderator_id matches admin",
    moderationAction.moderator_id,
    moderatorId,
  );
  TestValidator.equals(
    "user_id matches input",
    moderationAction.user_id,
    affectedUserId,
  );
  TestValidator.equals(
    "action_type matches input",
    moderationAction.action_type,
    moderationInput.action_type,
  );
  TestValidator.equals(
    "action_reason matches input",
    moderationAction.action_reason,
    moderationInput.action_reason,
  );
  TestValidator.equals(
    "details matches input",
    moderationAction.details,
    moderationInput.details,
  );
  TestValidator.equals(
    "effective_from matches input",
    moderationAction.effective_from,
    effectiveFrom,
  );
  TestValidator.equals(
    "effective_until matches input",
    moderationAction.effective_until,
    effectiveUntil,
  );
  TestValidator.predicate(
    "audit field - created_at present",
    typeof moderationAction.created_at === "string" &&
      moderationAction.created_at.length > 0,
  );
  TestValidator.predicate(
    "audit field - updated_at present",
    typeof moderationAction.updated_at === "string" &&
      moderationAction.updated_at.length > 0,
  );
  TestValidator.predicate(
    "system - no deleted_at present on creation",
    moderationAction.deleted_at === null ||
      moderationAction.deleted_at === undefined,
  );
}
