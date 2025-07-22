import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful deletion of a guest session by its UUID as an administrator.
 *
 * This test ensures an administrator can delete a guest session entity, per audit and compliance requirements.
 *
 * Steps:
 * 1. Register a new member as administrator (no explicit role API; all test-created members are considered admin).
 * 2. Create a guest session (to be deleted).
 * 3. Delete the guest by its UUID using eraseById.
 * 4. Validate that all the returned properties (id, session_token, ip_address, user_agent, created_at, expires_at) match the original guest (there is no deleted_at in the DTO).
 * 5. (Edge) Since there are no audit or retrieval endpoints for guests after deletion, acknowledge that audit-traceable information remains available only through the response, not subsequent API calls.
 */
export async function test_api_discussionBoard_guests_test_delete_guest_session_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin (discussion board member)
  const admin = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(admin);

  // 2. Create a guest session
  const guest = await api.functional.discussionBoard.guests.post(connection, {
    body: {
      session_token: RandomGenerator.alphaNumeric(12),
      ip_address: "127.0.0.1",
      user_agent: "test-agent",
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    },
  });
  typia.assert(guest);

  // 3. Delete the guest session
  const deleted = await api.functional.discussionBoard.guests.eraseById(connection, {
    id: guest.id,
  });
  typia.assert(deleted);

  // 4. Assert all properties match original guest (no deleted_at field in DTO):
  TestValidator.equals("guest id matches")(deleted.id)(guest.id);
  TestValidator.equals("session token matches")(deleted.session_token)(guest.session_token);
  TestValidator.equals("ip address matches")(deleted.ip_address)(guest.ip_address);
  TestValidator.equals("user agent matches")(deleted.user_agent)(guest.user_agent);
  TestValidator.equals("created at matches")(deleted.created_at)(guest.created_at);
  TestValidator.equals("expires at matches")(deleted.expires_at)(guest.expires_at);

  // 5. No further retrieval or audit endpoint exists; can only confirm audit compliance by preserved data in response
}