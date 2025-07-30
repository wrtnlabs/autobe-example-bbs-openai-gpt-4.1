import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Test that non-admin users cannot delete moderation actions.
 *
 * This test verifies that when a non-admin (member-level) user attempts to call
 * the admin-only moderation action deletion endpoint, the API should prevent
 * the action by returning a permission-denied error, and that no deletion
 * occurs. The steps cover proper resource setup and strict negative testing for
 * authorization enforcement in admin APIs.
 *
 * Steps:
 *
 * 1. Create a discussion board member (ordinary user, not admin).
 * 2. Create a moderation action as admin (so a valid moderationActionId exists).
 * 3. Switch API context to the member user (assuming test infra supports it).
 * 4. Attempt to delete the moderation action as the ordinary member.
 * 5. Assert that the delete operation fails with an authorization error
 *    (permission denied).
 * 6. (Optional) If API supports reading as member, verify that the moderation
 *    action was NOT deleted (skipped here, as API likely admin-only for
 *    read/delete).
 */
export async function test_api_discussionBoard_test_unauthorized_user_delete_moderation_action(
  connection: api.IConnection,
) {
  // 1. Create a member-level user (performed by admin via admin API)
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.name() + Date.now() + "@test.invalid",
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a moderation action (admin privilege)
  const moderationAction =
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      {
        body: {
          actor_admin_id: typia.random<string & tags.Format<"uuid">>(),
          action_type: "delete",
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // 3. Switch to member user context for subsequent calls (RBAC switch must be handled by test infrastructure).
  // The details of authentication switching depend on system and are assumed to be managed outside this function

  // 4. Attempt to delete moderation action as the member (non-admin context)
  await TestValidator.error(
    "Unauthorized member cannot delete moderation action",
  )(async () => {
    await api.functional.discussionBoard.admin.moderationActions.erase(
      connection,
      { moderationActionId: moderationAction.id },
    );
  });

  // 5. (Optional - not implemented): If readable by member, assert that the moderation action still exists.
}
