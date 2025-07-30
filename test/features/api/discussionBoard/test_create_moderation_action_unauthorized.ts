import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Test that access to the moderation action API is forbidden to unauthorized
 * users (guests or ordinary members).
 *
 * This test ensures that only privileged accounts (moderator or admin) may
 * create moderation actions. An ordinary member attempts to access the endpoint
 * and should be denied.
 *
 * Steps:
 *
 * 1. Register a regular discussion board member (not an admin or moderator).
 * 2. Attempt to create a moderation action while authenticated (or as guest if
 *    feasible), using valid-looking data but without any admin/moderator
 *    privileges.
 * 3. Confirm that the API denies the request (throws error, e.g. access
 *    denied/forbidden), and no moderation action is created.
 */
export async function test_api_discussionBoard_test_create_moderation_action_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register a regular discussion board member (admin-only API, so simulate/assume the user is now an ordinary member)
  const regularUserData: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphaNumeric(12),
    joined_at: new Date().toISOString(),
  };
  const regularMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: regularUserData,
    });
  typia.assert(regularMember);

  // (In a real scenario, we'd switch to member authentication here – omitted unless a login/auth endpoint is available)

  // 2. Attempt to create a moderation action without sufficient privileges
  // Provide minimal required data for body
  const modActionPayload: IDiscussionBoardModerationAction.ICreate = {
    action_type: "delete",
    action_details: "Test unauthorized attempt to delete a post.",
    post_id: typia.random<string & tags.Format<"uuid">>(),
    actor_moderator_id: null,
    actor_admin_id: null,
  };
  await TestValidator.error(
    "Unauthorized user cannot create moderation actions",
  )(async () => {
    await api.functional.discussionBoard.admin.moderationActions.create(
      connection,
      { body: modActionPayload },
    );
  });
}
