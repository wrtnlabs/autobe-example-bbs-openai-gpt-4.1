import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Validate that creating a user session with a duplicate session_token fails.
 *
 * This test case checks the unique constraint on session_token enforced by the
 * session creation API. To simulate an attempted session hijack or overlap,
 * this function first creates a valid session using a specific token, then
 * attempts to create another session with the exact same session_token. The
 * expected result is a conflict or validation error indicating that the
 * session_token must be unique among active sessions, thus preventing duplicate
 * active sessions using the same token.
 *
 * Steps:
 *
 * 1. Generate or choose consistent values for actor_type and actor_identifier, and
 *    a random session_token.
 * 2. Call api.functional.discussionBoard.userSessions.create to create an original
 *    session (success expected).
 * 3. Attempt to call api.functional.discussionBoard.userSessions.create again
 *    using the SAME session_token but with a different actor_identifier (to
 *    ensure the only conflict is the session_token).
 * 4. Assert that the second creation call fails with an error (e.g., unique
 *    constraint violation, conflict).
 * 5. Optionally, verify that the first session remains unaffected and valid.
 */
export async function test_api_discussionBoard_test_fail_to_create_session_with_duplicate_token(
  connection: api.IConnection,
) {
  // Step 1: Generate session parameters
  const actor_type = "member";
  const actor_identifier1 = RandomGenerator.alphaNumeric(16);
  const actor_identifier2 = RandomGenerator.alphaNumeric(16);
  const session_token = RandomGenerator.alphaNumeric(32);
  const now = new Date();
  const created_at = now.toISOString();
  // Expiry 24 hours later
  const expires_at = new Date(now.getTime() + 86400 * 1000).toISOString();

  // Step 2: Successfully create initial session
  const session1 = await api.functional.discussionBoard.userSessions.create(
    connection,
    {
      body: {
        actor_type,
        actor_identifier: actor_identifier1,
        session_token,
        created_at,
        expires_at,
      } satisfies IDiscussionBoardUserSession.ICreate,
    },
  );
  typia.assert(session1);
  TestValidator.equals("session_token matches")(session1.session_token)(
    session_token,
  );

  // Step 3: Attempt to create second session with duplicate session_token
  await TestValidator.error("duplicate session_token must result in conflict")(
    () =>
      api.functional.discussionBoard.userSessions.create(connection, {
        body: {
          actor_type,
          actor_identifier: actor_identifier2,
          session_token, // Same as previous
          created_at,
          expires_at,
        } satisfies IDiscussionBoardUserSession.ICreate,
      }),
  );
}
