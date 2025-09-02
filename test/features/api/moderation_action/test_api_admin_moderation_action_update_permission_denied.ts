import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Attempt to update a moderation action with invalid or missing admin
 * session/token.
 *
 * 1. Register and authenticate as admin to obtain a valid token (using
 *    /auth/admin/join).
 * 2. Prepare an update payload for a random moderationActionId.
 * 3. Invalidate the current session—simulate logout or clear the token from
 *    the connection object.
 * 4. Attempt to update a moderation action using the now-unauthenticated
 *    connection.
 * 5. Confirm that the API denies the request, producing an authorization error
 *    (401 Unauthorized or equivalent).
 * 6. Verify that no unintended side effects occur and that permission
 *    enforcement is robust.
 */
export async function test_api_admin_moderation_action_update_permission_denied(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: typia.random<IDiscussionBoardAdmin.ICreate>(),
  });
  typia.assert(adminAuth);

  // 2. Prepare a random moderationActionId and update payload
  const moderationActionId = typia.random<string & tags.Format<"uuid">>();
  const updatePayload =
    typia.random<IDiscussionBoardModerationAction.IUpdate>();

  // 3. Simulate expired/invalid session by forcibly removing token
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt to update the moderation action without a valid session
  await TestValidator.error(
    "should deny update when admin session is expired or missing",
    async () => {
      await api.functional.discussionBoard.admin.moderationActions.update(
        unauthorizedConn,
        {
          moderationActionId,
          body: updatePayload,
        },
      );
    },
  );
}
