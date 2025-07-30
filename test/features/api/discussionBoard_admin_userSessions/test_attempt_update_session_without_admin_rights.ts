import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Validate that only system administrators can update session records.
 *
 * This test ensures that when a non-admin (such as a regular member or guest)
 * attempts to update a user session via the admin session management endpoint,
 * the operation is denied with an appropriate permission error. This prevents
 * unauthorized users from forcibly expiring, logging out, or extending
 * sessions.
 *
 * Test steps:
 *
 * 1. Create a user session as a non-admin actor (e.g., member or guest).
 * 2. Attempt to update the session's expiry or termination via the admin endpoint
 *    without admin privileges.
 * 3. Confirm that a permission error is thrown (request is rejected).
 */
export async function test_api_discussionBoard_admin_userSessions_test_attempt_update_session_without_admin_rights(
  connection: api.IConnection,
) {
  // 1. Create a session as a non-admin actor (e.g., member)
  const session = await api.functional.discussionBoard.userSessions.create(
    connection,
    {
      body: {
        actor_type: "member",
        actor_identifier: typia.random<string>(),
        session_token: typia.random<string>(),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
      } satisfies IDiscussionBoardUserSession.ICreate,
    },
  );
  typia.assert(session);

  // 2. Attempt to update session expiry via admin endpoint as a non-admin
  await TestValidator.error(
    "Only admins can update sessions via admin endpoint",
  )(async () => {
    await api.functional.discussionBoard.admin.userSessions.update(connection, {
      userSessionId: session.id,
      body: {
        expires_at: new Date(Date.now() + 7200_000).toISOString(),
      } satisfies IDiscussionBoardUserSession.IUpdate,
    });
  });
}
