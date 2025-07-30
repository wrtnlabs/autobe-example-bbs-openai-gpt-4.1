import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test admin retrieval of the complete guest session list.
 *
 * This test verifies that an admin can retrieve all tracked guest sessions in
 * the discussion board analytics system. It ensures guest session data exists
 * (creating a record if necessary), then fetches the list as admin, and asserts
 * both schema correctness and business expectations:
 *
 * 1. Ensure at least one guest session exists using the guest creation endpoint.
 * 2. Call GET /discussionBoard/admin/guests as admin to fetch all guest records.
 * 3. Confirm the response includes the created guest and every record contains
 *    required fields (id, session_identifier, first_seen_at, last_seen_at) in
 *    correct types/formats.
 * 4. (Optional) Confirm access restriction: only admins can access this data.
 */
export async function test_api_discussionBoard_test_list_all_guest_sessions_successfully(
  connection: api.IConnection,
) {
  // 1. Create a guest session to guarantee retrievable guest data exists
  const guestCreateInput: IDiscussionBoardGuest.ICreate = {
    session_identifier: typia.random<string>(),
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  };
  const createdGuest = await api.functional.discussionBoard.guests.create(
    connection,
    { body: guestCreateInput },
  );
  typia.assert(createdGuest);

  // 2. Retrieve the guest session list as admin
  const guestsPage =
    await api.functional.discussionBoard.admin.guests.index(connection);
  typia.assert(guestsPage);

  // 3. Assert the created guest is present in the admin session list
  const match = guestsPage.data.find((g) => g.id === createdGuest.id);
  TestValidator.predicate("created guest is included in admin session list")(
    !!match,
  );

  // 4. Validate every guest record conforms to required fields and types
  for (const guest of guestsPage.data) {
    TestValidator.predicate("guest.id is uuid")(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        guest.id,
      ),
    );
    TestValidator.predicate("session_identifier is non-empty string")(
      typeof guest.session_identifier === "string" &&
        guest.session_identifier.length > 0,
    );
    TestValidator.predicate("first_seen_at is valid ISO 8601")(
      typeof guest.first_seen_at === "string" &&
        !Number.isNaN(Date.parse(guest.first_seen_at)),
    );
    TestValidator.predicate("last_seen_at is valid ISO 8601")(
      typeof guest.last_seen_at === "string" &&
        !Number.isNaN(Date.parse(guest.last_seen_at)),
    );
  }
}
