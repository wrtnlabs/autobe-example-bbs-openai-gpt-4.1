import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Error handling: retrieving a guest session with a non-existent or invalid ID
 *
 * This test ensures that attempts to fetch guest session information for an ID
 * that does not exist (i.e., random and not present in the system) are properly
 * rejected by the API without leaking data.
 *
 * Steps:
 *
 * 1. Generate a random UUID (valid format, but not assigned to any actual guest)
 * 2. Issue a GET request to `/discussionBoard/admin/guests/{guestId}` using this
 *    random UUID
 * 3. Confirm the API responds with an appropriate not-found error (such as HTTP
 *    404)
 * 4. Validate that no guest data is returned and that the error is properly
 *    handled
 *
 * Edge cases:
 *
 * - Non-existent ID in valid UUID format
 *
 * Note: Invalid UUID format scenario is not typeable with strict TypeScript
 * types and is thus omitted.
 */
export async function test_api_discussionBoard_test_retrieve_guest_by_id_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a valid-format but non-existent guest ID
  const nonExistentGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to fetch guest session by nonexistent ID, expect not-found error
  await TestValidator.error("should return not-found for non-existent guestId")(
    async () => {
      await api.functional.discussionBoard.admin.guests.at(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
