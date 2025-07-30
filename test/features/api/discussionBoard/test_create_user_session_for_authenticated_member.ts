import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Validate session creation for an authenticated member as user session.
 *
 * This test simulates a logged-in member attempting to create a tracked session
 * in the discussion board system. The purpose is to confirm that a legitimate
 * member can initiate a new session, and the API correctly persists and returns
 * all mandatory session attributes.
 *
 * Steps:
 *
 * 1. Prepare test actor data: Generate a unique member identifier to simulate a
 *    registered user. (If there were a member onboarding endpoint, we would use
 *    it, but in this scenario we'll use a generated value since no such
 *    endpoint is present.)
 * 2. Construct the IDiscussionBoardUserSession.ICreate session with:
 *
 *    - Actor_type = "member"
 *    - Actor_identifier: unique test value
 *    - Session_token: secure and unique value
 *    - Created_at: current timestamp
 *    - Expires_at: valid future timestamp
 * 3. Call api.functional.discussionBoard.userSessions.create with the constructed
 *    session request body.
 * 4. Assert response type and content:
 *
 *    - All expected fields are present (id, actor_type, actor_identifier,
 *         session_token, created_at, expires_at)
 *    - Actor_type matches input ("member")
 *    - Actor_identifier matches input
 *    - Session_token matches input
 *    - Created_at and expires_at match or are consistent (ISO 8601 format and
 *         logical relationship)
 *    - Terminated_at is null or undefined indicating an active session on creation
 */
export async function test_api_discussionBoard_userSessions_create(
  connection: api.IConnection,
) {
  // Step 1: Prepare unique member identifier and secure session token
  const actor_identifier: string = `member_${typia.random<string & tags.Format<"uuid">>()}`;
  const session_token: string = typia.random<string & tags.Format<"uuid">>();
  const created_at: string = new Date().toISOString();
  // Set expires_at to 2 hours in the future (ISO 8601)
  const expires_at: string = new Date(
    Date.now() + 2 * 60 * 60 * 1000,
  ).toISOString();

  // Step 2: Compose session creation body
  const body: IDiscussionBoardUserSession.ICreate = {
    actor_type: "member",
    actor_identifier,
    session_token,
    created_at,
    expires_at,
  };

  // Step 3: Create session
  const session = await api.functional.discussionBoard.userSessions.create(
    connection,
    { body },
  );
  typia.assert(session);

  // Step 4: Validate response contents
  TestValidator.equals("actor_type is 'member'")(session.actor_type)("member");
  TestValidator.equals("actor_identifier matches")(session.actor_identifier)(
    actor_identifier,
  );
  TestValidator.equals("session_token matches")(session.session_token)(
    session_token,
  );
  TestValidator.equals("created_at matches")(session.created_at)(created_at);
  TestValidator.equals("expires_at matches")(session.expires_at)(expires_at);
  TestValidator.equals("session id is present and uuid format")(
    typeof session.id === "string" && /^[0-9a-fA-F-]{36}$/.test(session.id),
  )(true);
  TestValidator.equals("terminated_at is null or undefined")(
    session.terminated_at === null || session.terminated_at === undefined,
  )(true);
}
