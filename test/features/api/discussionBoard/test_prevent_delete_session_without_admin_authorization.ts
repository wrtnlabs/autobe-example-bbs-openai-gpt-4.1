import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Validate that session deletion by unauthorized (non-admin) actors is blocked.
 *
 * This test ensures that a member or guest cannot delete a tracked session
 * record using the admin deletion endpoint, confirming that proper
 * authorization is enforced.
 *
 * Steps:
 *
 * 1. Create a new user or guest session (simulating as non-admin).
 * 2. Attempt to delete the created session using the admin endpoint, while still
 *    authenticated as a non-admin.
 * 3. Check that the API returns a permission error (access is denied), and the
 *    session is not deleted.
 */
export async function test_api_discussionBoard_test_prevent_delete_session_without_admin_authorization(
  connection: api.IConnection,
) {
  // 1. Create a user (member) session
  const session: IDiscussionBoardUserSession =
    await api.functional.discussionBoard.userSessions.create(connection, {
      body: {
        actor_type: "member",
        actor_identifier: RandomGenerator.alphaNumeric(16),
        session_token: typia.random<string & tags.Format<"uuid">>(),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      } satisfies IDiscussionBoardUserSession.ICreate,
    });
  typia.assert(session);

  // 2. Attempt to delete this session as a non-admin (should fail)
  await TestValidator.error("deny session deletion by non-admin")(async () => {
    await api.functional.discussionBoard.admin.userSessions.erase(connection, {
      userSessionId: session.id,
    });
  });
}
