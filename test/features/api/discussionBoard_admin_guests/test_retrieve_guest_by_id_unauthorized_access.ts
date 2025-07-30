import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test unauthorized access restriction for retrieving guest session details by
 * ID via the admin endpoint.
 *
 * This test validates that only users with admin privileges can access the
 * guest analytics record using GET /discussionBoard/admin/guests/{guestId}. A
 * non-admin session attempts to access a guest's details and must be denied
 * with an appropriate error, and not receive any guest session object or
 * sensitive metadata back.
 *
 * Steps:
 *
 * 1. Generate a random guest session ID (UUID format) for the test.
 * 2. Attempt to retrieve guest details from
 *    /discussionBoard/admin/guests/{guestId} using a connection that does NOT
 *    have admin privileges (e.g., guest, regular user, or unauthenticated).
 * 3. Assert that access is denied (forbidden or unauthorized error is thrown;
 *    error code 403 or 401 as appropriate).
 * 4. Assert that no guest session data (IDiscussionBoardGuest or otherwise) is
 *    returned to the caller (i.e., error is thrown and response is not of
 *    IDiscussionBoardGuest type).
 *
 * This ensures the endpoint is access-controlled and does not leak guest
 * analytics information to non-admin users.
 */
export async function test_api_discussionBoard_admin_guests_test_retrieve_guest_by_id_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Generate a random guest session UUID for testing
  const guestId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to retrieve as non-admin (assumed by default connection unless elevated)
  await TestValidator.error(
    "non-admin cannot access admin guest session detail endpoint",
  )(async () => {
    await api.functional.discussionBoard.admin.guests.at(connection, {
      guestId,
    });
  });
}
