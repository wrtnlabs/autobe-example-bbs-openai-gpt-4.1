import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Validate that an admin can successfully delete a user or guest session.
 *
 * This test ensures the compliance and effectiveness of admin session
 * revocation logic according to security and session retention policies:
 *
 * 1. A user session or guest session is created using the POST endpoint; this
 *    guarantees that a session exists in the tracking table.
 * 2. The session is then deleted via the admin DELETE endpoint, using its unique
 *    session ID.
 * 3. The test confirms that the deletion completes successfully.
 *
 * **Note:** As there is no GET or lookup endpoint for session records exposed,
 * the test cannot further verify nonexistence of the deleted record. Only the
 * absence of errors and status code compliance can be checked with available
 * endpoints.
 */
export async function test_api_discussionBoard_admin_userSessions_test_delete_session_by_admin_successfully(
  connection: api.IConnection,
) {
  // 1. Create a user or guest session to be deleted
  const userSession = await api.functional.discussionBoard.userSessions.create(
    connection,
    {
      body: {
        actor_type: "guest",
        actor_identifier: typia.random<string>(),
        session_token: typia.random<string>(),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      } satisfies IDiscussionBoardUserSession.ICreate,
    },
  );
  typia.assert(userSession);

  // 2. Delete the session as an admin by userSessionId
  await api.functional.discussionBoard.admin.userSessions.erase(connection, {
    userSessionId: userSession.id,
  });
  // 3. (Limitation) Without a GET or query endpoint for user sessions,
  // further confirmation of nonexistence is not possible.
}
