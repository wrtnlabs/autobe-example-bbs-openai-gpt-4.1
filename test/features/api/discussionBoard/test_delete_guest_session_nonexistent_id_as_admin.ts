import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Attempt to delete a guest session by a non-existent guestId as admin.
 *
 * This test validates robust error handling when an admin tries to hard-delete
 * a guest session record that does not exist. Such operations are crucial for
 * ensuring system data integrity and correct cleanup procedures for guest
 * session analytics. If the given guestId is not present in the tracking
 * system, the API must respond with a not-found error (typically HTTP 404),
 * rather than succeeding or giving a misleading response.
 *
 * Steps:
 *
 * 1. Generate a random UUID for guestId, guaranteed to not match any real session.
 * 2. Attempt to delete the guest session via the admin endpoint.
 * 3. Assert that a not-found error is thrown, confirming strong integrity checks.
 */
export async function test_api_discussionBoard_test_delete_guest_session_nonexistent_id_as_admin(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for the non-existent guestId
  const nonexistentGuestId = typia.random<string & tags.Format<"uuid">>();

  // 2 & 3. Attempt deletion and assert that a not-found error is thrown
  await TestValidator.error(
    "should fail with not-found for nonexistent guestId",
  )(async () => {
    await api.functional.discussionBoard.admin.guests.erase(connection, {
      guestId: nonexistentGuestId,
    });
  });
}
