import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";

/**
 * Attempt to create a discussion board user session while missing required
 * fields.
 *
 * This test ensures that the API correctly validates input and rejects
 * incomplete requests for creating user or guest sessions. It tries several
 * scenarios where one or more required fields (such as actor_type,
 * actor_identifier, session_token, created_at, or expires_at) are omitted from
 * the input body, and confirms that the API responds with a validation error
 * for each case. The API must not create a new session record if any required
 * property is missing.
 *
 * Process steps:
 *
 * 1. Construct valid session creation data per
 *    IDiscussionBoardUserSession.ICreate.
 * 2. For each required field, generate a request body omitting that field.
 * 3. Attempt to call api.functional.discussionBoard.userSessions.create for each
 *    invalid body.
 * 4. Assert that each request fails with a validation error (e.g., using
 *    TestValidator.error()).
 * 5. (Optional) Could further check error messages for the name of the missing
 *    property, but checking error occurrence suffices.
 */
export async function test_api_discussionBoard_test_fail_to_create_session_with_missing_required_fields(
  connection: api.IConnection,
) {
  // Step 1: Construct a valid session creation object according to the schema
  const valid: IDiscussionBoardUserSession.ICreate = {
    actor_type: "member",
    actor_identifier: typia.random<string>(),
    session_token: typia.random<string>(),
    created_at: typia.random<string & tags.Format<"date-time">>(),
    expires_at: typia.random<string & tags.Format<"date-time">>(),
  };

  const requiredKeys: ReadonlyArray<keyof IDiscussionBoardUserSession.ICreate> =
    [
      "actor_type",
      "actor_identifier",
      "session_token",
      "created_at",
      "expires_at",
    ];

  // Step 2,3,4: For each required field, attempt to create a session with that key omitted
  for (const key of requiredKeys) {
    const invalid = { ...valid };
    delete invalid[key];
    await TestValidator.error(`Missing required property: ${key}`)(async () => {
      await api.functional.discussionBoard.userSessions.create(connection, {
        body: invalid as any,
      });
    });
  }
}
