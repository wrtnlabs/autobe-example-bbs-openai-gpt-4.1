import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Validate that creating a guest session with a duplicate session_identifier
 * fails.
 *
 * Business context: Guest sessions on the discussion board are tracked using a
 * unique `session_identifier` to ensure accurate analytics, prevent abuse, and
 * support proper onboarding. The API must reject any attempt to create a guest
 * session record with a session_identifier that already exists, returning an
 * error indicating the uniqueness violation.
 *
 * Test Steps:
 *
 * 1. Prepare a fixed `session_identifier` and timestamps for guest session
 *    creation.
 * 2. Successfully create the first guest session with those values.
 * 3. Attempt to create a second guest session with the same `session_identifier`
 *    and expect an error (such as a conflict or duplicate entry error) to be
 *    thrown by the API.
 * 4. Confirm success on the first request and verify the error behavior and type
 *    correctness of the API response for the second call.
 */
export async function test_api_discussionBoard_test_create_guest_session_with_duplicate_session_identifier(
  connection: api.IConnection,
) {
  // 1. Prepare fixed session_identifier and timestamps for deterministic behavior
  const sessionIdentifier = typia.random<string>();
  const now = new Date().toISOString() as string & tags.Format<"date-time">;

  // 2. Successfully create the initial guest session
  const guest = await api.functional.discussionBoard.guests.create(connection, {
    body: {
      session_identifier: sessionIdentifier,
      first_seen_at: now,
      last_seen_at: now,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guest);
  TestValidator.equals("session identifier matches")(guest.session_identifier)(
    sessionIdentifier,
  );

  // 3. Attempt to create a guest session again with the same session_identifier (should fail)
  await TestValidator.error("duplicate session_identifier should fail")(
    async () => {
      await api.functional.discussionBoard.guests.create(connection, {
        body: {
          session_identifier: sessionIdentifier,
          first_seen_at: now,
          last_seen_at: now,
        } satisfies IDiscussionBoardGuest.ICreate,
      });
    },
  );
}
