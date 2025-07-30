import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Validate that an admin can terminate a user session via the update API.
 *
 * This test ensures that:
 *
 * 1. A session can be created as a normal user (using the userSessions create
 *    API).
 * 2. An admin can mark this session as terminated by updating the terminated_at
 *    field (using the admin userSessions update API).
 * 3. The response reflects the update and the session is now shown as terminated.
 *
 * Steps:
 *
 * 1. Create a user session (simulate normal login/session creation).
 * 2. As admin, update the session with a terminated_at timestamp.
 * 3. Validate that the terminated_at on the response is correctly set and not
 *    null.
 * 4. Validate the update reflects proper session linkage.
 */
export async function test_api_discussionBoard_admin_userSessions_test_update_session_to_terminate_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a user session (normal user flow)
  const sessionInput = {
    actor_type: "member",
    actor_identifier: RandomGenerator.alphabets(8),
    session_token: typia.random<string & tags.Format<"uuid">>(),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  } satisfies IDiscussionBoardUserSession.ICreate;

  const createdSession =
    await api.functional.discussionBoard.userSessions.create(connection, {
      body: sessionInput,
    });
  typia.assert(createdSession);

  // 2. Admin terminates the session using current timestamp
  const terminationTime = new Date().toISOString();
  const updateInput = {
    terminated_at: terminationTime,
  } satisfies IDiscussionBoardUserSession.IUpdate;

  const updatedSession =
    await api.functional.discussionBoard.admin.userSessions.update(connection, {
      userSessionId: createdSession.id,
      body: updateInput,
    });
  typia.assert(updatedSession);

  // 3. Confirm the session is properly marked as terminated
  TestValidator.equals("terminated_at should be set")(
    updatedSession.terminated_at !== null &&
      updatedSession.terminated_at !== undefined,
  )(true);
  TestValidator.equals("terminated_at value matches")(
    updatedSession.terminated_at,
  )(terminationTime);
  TestValidator.equals("IDs should match")(updatedSession.id)(
    createdSession.id,
  );
}
