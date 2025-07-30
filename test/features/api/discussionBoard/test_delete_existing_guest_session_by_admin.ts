import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Verify admin-driven hard deletion of a guest session by guestId.
 *
 * This test simulates the admin cleanup or compliance erasure process for a
 * tracked guest analytics session. It ensures that a guest session can be:
 *
 * - Created and persisted with valid, unique session information
 * - Successfully deleted via the admin API
 * - Confirmed as deleted by absence (if possible)
 *
 * Test process:
 *
 * 1. Provision a guest session through the public guest creation API with a unique
 *    session identifier and valid timestamps
 * 2. Delete that guest session using the admin API and the resulting guestId
 * 3. (If read API existed) Attempt to fetch the guest record to confirm it is gone
 * 4. Since no fetch-by-id API is available, only verify successful completion of
 *    delete sequence
 */
export async function test_api_discussionBoard_test_delete_existing_guest_session_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a new guest session for analytics tracking
  const now = new Date().toISOString();
  const guest = await api.functional.discussionBoard.guests.create(connection, {
    body: {
      session_identifier: typia.random<string>(),
      first_seen_at: now,
      last_seen_at: now,
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guest);

  // 2. Delete the guest session using the admin-only erase endpoint
  await api.functional.discussionBoard.admin.guests.erase(connection, {
    guestId: guest.id,
  });

  // 3. Post-delete validation (no read endpoint available)
  // If a "fetch by guestId" API existed, would call and expect "not found".
  // Since no such endpoint is available, confirm that no error is thrown and operation completes.
}
