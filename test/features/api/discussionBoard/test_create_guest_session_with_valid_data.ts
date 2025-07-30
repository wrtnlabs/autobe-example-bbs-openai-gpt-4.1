import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test the successful creation of a new guest session (unauthenticated
 * analytics record).
 *
 * This test ensures that an unauthenticated guest visiting the discussion board
 * is correctly tracked by the backend system via an explicit session_identifier
 * and required timestamps.
 *
 * Steps:
 *
 * 1. Prepare a unique session_identifier and ISO 8601 timestamps for first_seen_at
 *    and last_seen_at (matching).
 * 2. Call the POST /discussionBoard/guests endpoint with the crafted body
 *    (IDiscussionBoardGuest.ICreate).
 * 3. Validate that the response is a persisted IDiscussionBoardGuest object with
 *    fields matching the input values (except for server-generated id).
 * 4. The response id field should be a valid UUID and not empty.
 * 5. No authentication or other rate limiting logic is exercised.
 * 6. Edge Case: Ensure last_seen_at equal to first_seen_at on creation is
 *    accepted.
 */
export async function test_api_discussionBoard_test_create_guest_session_with_valid_data(
  connection: api.IConnection,
) {
  // Step 1: Prepare unique session_identifier and current ISO timestamps
  const sessionIdentifier: string = typia.random<string>();
  const now: string = new Date().toISOString();
  const input: IDiscussionBoardGuest.ICreate = {
    session_identifier: sessionIdentifier,
    first_seen_at: now,
    last_seen_at: now,
  };

  // Step 2: Call the API to create a guest session
  const guest = await api.functional.discussionBoard.guests.create(connection, {
    body: input,
  });
  typia.assert(guest);

  // Step 3: Verify response matches input (except for server-generated id)
  TestValidator.equals("session_identifier matches")(guest.session_identifier)(
    input.session_identifier,
  );
  TestValidator.equals("first_seen_at matches")(guest.first_seen_at)(
    input.first_seen_at,
  );
  TestValidator.equals("last_seen_at matches")(guest.last_seen_at)(
    input.last_seen_at,
  );

  // Step 4: Validate server-generated id field (must be valid UUID and not empty)
  TestValidator.predicate("id is a valid UUID")(
    !!guest.id && typeof guest.id === "string" && guest.id.length > 0,
  );
}
