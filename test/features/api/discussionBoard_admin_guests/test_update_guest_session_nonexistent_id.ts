import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Validate error handling when updating a guest session using a non-existent
 * guestId.
 *
 * Ensures the API returns the correct not-found error when attempting to update
 * a guest session with an ID that does not exist in the system. This is
 * important for audit and analytics tools, ensuring stale or invalid links are
 * safely rejected and not found conditions are handled properly.
 *
 * Steps:
 *
 * 1. Generate a random UUID that is highly unlikely to exist in the guest session
 *    database (ensuring non-existence).
 * 2. Build a valid guest update payload (e.g., updating last_seen_at with a
 *    current ISO timestamp).
 * 3. Attempt to invoke the admin guest update endpoint with this random UUID.
 * 4. Assert that the result is an error (any error is expected, as per guidelines;
 *    error message/type is not inspected).
 */
export async function test_api_discussionBoard_admin_guests_test_update_guest_session_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Generate random non-existent guestId
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();

  // 2. Construct valid guest update payload
  const updatePayload: IDiscussionBoardGuest.IUpdate = {
    last_seen_at: new Date().toISOString(),
  };

  // 3 & 4. Attempt update with random guestId and expect any error (not-found)
  await TestValidator.error("not found error for non-existent guestId")(
    async () => {
      await api.functional.discussionBoard.admin.guests.update(connection, {
        guestId: nonExistentGuestId,
        body: updatePayload,
      });
    },
  );
}
