import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Test that an admin can permanently delete a moderation action.
 *
 * Business context: Only admins can permanently delete moderation actions from
 * the board. Such deletions are irreversible and must be logged for
 * audit/compliance, but the test omits log verification since there is no log
 * retrieval endpoint. This test ensures the delete operation is performed with
 * proper admin context, and that an existing moderation action is removed using
 * the correct workflow.
 *
 * Step-by-step process:
 *
 * 1. Create a board admin using the admin creation endpoint to ensure proper
 *    privileges
 * 2. Create a moderation action as that admin (as actor_admin_id)
 * 3. Permanently delete the moderation action as an admin
 * 4. (Omitted) Validate nonexistence/log as there are no endpoints for it
 * 5. Test succeeds if no error is thrown on deletion, confirming permissions,
 *    irreversible removal, and audit compliance by backend
 */
export async function test_api_discussionBoard_test_admin_delete_moderation_action_success(
  connection: api.IConnection,
) {
  // 1. Create an admin to act as the moderation actor (for permission context)
  const adminIdentifier = RandomGenerator.alphaNumeric(12);
  const now = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: adminIdentifier,
        granted_at: now,
        revoked_at: null,
      } satisfies IDiscussionBoardAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Create a moderation action as this admin
  const moderationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      {
        body: {
          actor_admin_id: admin.id,
          action_type: "delete",
          action_details:
            "Test permanent delete action by admin for E2E validation.",
          post_id: null,
          comment_id: null,
          report_id: null,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // 3. Delete the moderation action using the moderation action's id
  await api.functional.discussionBoard.admin.moderationActions.erase(
    connection,
    {
      moderationActionId: moderationAction.id,
    },
  );

  // 4. There is no endpoint to assert deletion or to audit the action log directly
  // so test completion without error is considered success
}
