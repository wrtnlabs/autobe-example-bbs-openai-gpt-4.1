import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Test creation of a guest session for anonymous user tracking.
 *
 * This test verifies that when an anonymous guest visits the discussion board,
 * a guest session record can be created with actor_type 'guest', a unique
 * session_token, and the necessary creation/expiration timestamps. This ensures
 * tracking for non-authenticated visitors is compliant with analytics and audit
 * requirements.
 *
 * Step-by-step process:
 *
 * 1. Build a guest session creation payload with required properties: actor_type =
 *    'guest', unique actor_identifier, unique session_token, created_at, and
 *    expires_at.
 * 2. Call the session creation API.
 * 3. Assert the returned session contains all required fields and matches the
 *    provided request values where appropriate.
 * 4. Validate that the output type is correct and actor_type is 'guest'.
 */
export async function test_api_discussionBoard_test_create_guest_session_for_anonymous_user(
  connection: api.IConnection,
) {
  // Step 1: Build guest session request body
  const now = new Date();
  const body: IDiscussionBoardUserSession.ICreate = {
    actor_type: "guest",
    actor_identifier: typia.random<string & tags.Format<"uuid">>(),
    session_token: typia.random<string & tags.Format<"uuid">>(),
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(), // +1 day
  };

  // Step 2: Create session via API
  const session = await api.functional.discussionBoard.userSessions.create(
    connection,
    { body },
  );
  typia.assert(session);

  // Step 3: Validate output fields
  TestValidator.equals("actor_type should be guest")(session.actor_type)(
    "guest",
  );
  TestValidator.equals("session_token matches")(session.session_token)(
    body.session_token,
  );
  TestValidator.equals("actor_identifier matches")(session.actor_identifier)(
    body.actor_identifier,
  );
  TestValidator.equals("created_at matches")(session.created_at)(
    body.created_at,
  );
  TestValidator.equals("expires_at matches")(session.expires_at)(
    body.expires_at,
  );

  // Step 4: Output must include valid uuid for id
  TestValidator.predicate("session.id should be uuid")(
    typeof session.id === "string" && session.id.length > 20,
  );
  // terminated_at should be null or undefined upon creation
  TestValidator.predicate("terminated_at should be null or undefined")(
    session.terminated_at === null || session.terminated_at === undefined,
  );
}
