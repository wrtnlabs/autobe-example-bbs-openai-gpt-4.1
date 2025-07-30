import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Validates admin ability to update an existing guest session's last_seen_at
 * timestamp.
 *
 * This test ensures:
 *
 * 1. An initial guest session is created for tracking.
 * 2. An admin updates the last_seen_at field, simulating session prolongation or
 *    analytics update.
 * 3. The response reflects the updated timestamp, while immutable fields stay
 *    unchanged.
 * 4. Only allowed (updateable) fields can be modified.
 *
 * Test Steps:
 *
 * 1. Create a new guest session (POST /discussionBoard/guests)
 * 2. As admin, update the guest session's last_seen_at via PUT
 *    /discussionBoard/admin/guests/{guestId}
 * 3. Assert that last_seen_at is updated to the new value.
 * 4. Assert that id remains unchanged and first_seen_at still matches the
 *    originally created value.
 * 5. Assert that session_identifier is also unchanged.
 */
export async function test_api_discussionBoard_test_update_guest_session_last_seen_time_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session
  const guestCreateBody: IDiscussionBoardGuest.ICreate = {
    session_identifier: typia.random<string>(),
    first_seen_at: typia.random<string & tags.Format<"date-time">>(),
    last_seen_at: typia.random<string & tags.Format<"date-time">>(),
  };
  const originalGuest = await api.functional.discussionBoard.guests.create(
    connection,
    { body: guestCreateBody },
  );
  typia.assert(originalGuest);

  // Step 2: Prepare a new valid timestamp for last_seen_at; ensure it differs from the original value
  let newLastSeen = typia.random<string & tags.Format<"date-time">>();
  while (newLastSeen === originalGuest.last_seen_at) {
    newLastSeen = typia.random<string & tags.Format<"date-time">>();
  }

  // Step 3: As admin, update just the last_seen_at field
  const updatedGuest = await api.functional.discussionBoard.admin.guests.update(
    connection,
    {
      guestId: originalGuest.id,
      body: { last_seen_at: newLastSeen },
    },
  );
  typia.assert(updatedGuest);

  // Step 4: Assert the last_seen_at was changed, id and first_seen_at remain the same, session_identifier is unchanged
  TestValidator.notEquals("last_seen_at updated")(updatedGuest.last_seen_at)(
    originalGuest.last_seen_at,
  );
  TestValidator.equals("last_seen_at matches update")(
    updatedGuest.last_seen_at,
  )(newLastSeen);
  TestValidator.equals("id is immutable")(updatedGuest.id)(originalGuest.id);
  TestValidator.equals("first_seen_at is immutable")(
    updatedGuest.first_seen_at,
  )(originalGuest.first_seen_at);
  TestValidator.equals("session_identifier is unchanged")(
    updatedGuest.session_identifier,
  )(originalGuest.session_identifier);
}
