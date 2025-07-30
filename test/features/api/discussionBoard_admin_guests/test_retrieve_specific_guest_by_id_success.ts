import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Validate retrieval of a specific guest session by admin using guestId.
 *
 * This test ensures that an admin can fetch the record for a guest session by
 * its unique id and that all fields returned match exactly what was stored at
 * creation. This is crucial to verify the traceability of anonymous guest
 * sessions for compliance, analytics, and troubleshooting.
 *
 * Steps:
 *
 * 1. Create a guest session using the public guests endpoint (dependency setup)
 * 2. As admin, fetch the session using its id via the admin endpoint
 * 3. Assert the returned data exactly matches what was inserted
 *    (session_identifier, first_seen_at, last_seen_at, id)
 */
export async function test_api_discussionBoard_admin_guests_test_retrieve_specific_guest_by_id_success(
  connection: api.IConnection,
) {
  // 1. Create a new guest session (dependency setup)
  const createInput: IDiscussionBoardGuest.ICreate = {
    session_identifier: RandomGenerator.alphabets(18),
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  };
  const created: IDiscussionBoardGuest =
    await api.functional.discussionBoard.guests.create(connection, {
      body: createInput,
    });
  typia.assert(created);

  // 2. Retrieve the guest session as admin by id
  const found: IDiscussionBoardGuest =
    await api.functional.discussionBoard.admin.guests.at(connection, {
      guestId: created.id,
    });
  typia.assert(found);

  // 3. Validate all fields match
  TestValidator.equals("id matches")(found.id)(created.id);
  TestValidator.equals("session_identifier matches")(found.session_identifier)(
    createInput.session_identifier,
  );
  TestValidator.equals("first_seen_at matches")(found.first_seen_at)(
    createInput.first_seen_at,
  );
  TestValidator.equals("last_seen_at matches")(found.last_seen_at)(
    createInput.last_seen_at,
  );
}
