import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Validate that an admin can retrieve the details of a user or guest session by
 * supplying a valid userSessionId.
 *
 * This test ensures that admin users can audit, troubleshoot, and forcibly
 * manage sessions as required for compliance and administration. To simulate
 * this scenario, the test:
 *
 * 1. Creates a new user or guest session record using the public session creation
 *    endpoint.
 * 2. As an admin (authorization presumed present in connection context), performs
 *    a GET by userSessionId to retrieve the session details.
 * 3. Verifies that all session details (id, actor_type, actor_identifier,
 *    session_token, timestamps, etc.) are present and match what was stored
 *    during creation.
 * 4. This ensures audit, traceability, and forced-logout flows work as expected.
 */
export async function test_api_discussionBoard_admin_userSessions_at(
  connection: api.IConnection,
) {
  // 1. Create a new user/guest session
  const createInput: IDiscussionBoardUserSession.ICreate = {
    actor_type: "guest",
    actor_identifier: typia.random<string>(),
    session_token: typia.random<string>(),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // Expires in 1 hour
  };

  const createdSession: IDiscussionBoardUserSession =
    await api.functional.discussionBoard.userSessions.create(connection, {
      body: createInput,
    });
  typia.assert(createdSession);

  // 2. As admin, retrieve session by ID
  const fetchedSession: IDiscussionBoardUserSession =
    await api.functional.discussionBoard.admin.userSessions.at(connection, {
      userSessionId: createdSession.id,
    });
  typia.assert(fetchedSession);

  // 3. Validate that all returned session details match what was created
  TestValidator.equals("session id matches")(fetchedSession.id)(
    createdSession.id,
  );
  TestValidator.equals("actor_type matches")(fetchedSession.actor_type)(
    createdSession.actor_type,
  );
  TestValidator.equals("actor_identifier matches")(
    fetchedSession.actor_identifier,
  )(createdSession.actor_identifier);
  TestValidator.equals("session_token matches")(fetchedSession.session_token)(
    createdSession.session_token,
  );
  TestValidator.equals("created_at matches")(fetchedSession.created_at)(
    createdSession.created_at,
  );
  TestValidator.equals("expires_at matches")(fetchedSession.expires_at)(
    createdSession.expires_at,
  );
  TestValidator.equals("terminated_at matches")(
    fetchedSession.terminated_at === undefined
      ? null
      : fetchedSession.terminated_at,
  )(
    createdSession.terminated_at === undefined
      ? null
      : createdSession.terminated_at,
  );
}
