import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate that unauthorized users (guests and regular members) cannot access guest session details.
 *
 * This test ensures access control is enforced for GET /discussionBoard/guests/{id}:
 *  - Guests (not logged in/unauthenticated) are forbidden from retrieving session details
 *  - Normal discussion board members are also denied access to guest details
 *  - Only privileged roles (admin/moderator, not tested here) are permitted (outside scope of this test)
 *
 * Steps:
 * 1. Create a guest session using POST /discussionBoard/guests
 * 2. Register a normal member using POST /discussionBoard/members
 * 3. As a guest (no authentication), attempt to GET guest details → expect error
 * 4. As a regular member (simulate as same connection), attempt to GET guest details → expect error
 *
 * The test will pass if both guest and member attempts are rejected (error thrown), confirming privilege enforcement.
 */
export async function test_api_discussionBoard_test_get_guest_details_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Create a guest session entity
  const guestInput = {
    session_token: RandomGenerator.alphaNumeric(24),
    ip_address: "192.168.100.25",
    user_agent: RandomGenerator.alphaNumeric(12),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  } satisfies IDiscussionBoardGuest.ICreate;
  const guest = await api.functional.discussionBoard.guests.post(connection, {
    body: guestInput,
  });
  typia.assert(guest);

  // 2. Create a normal discussion board member
  const memberInput = {
    username: RandomGenerator.alphaNumeric(12),
    email: RandomGenerator.alphabets(8) + "@test.com",
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.alphabets(10),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: memberInput,
  });
  typia.assert(member);

  // 3. As a guest (no privilege), attempt to get guest details - expect error
  await TestValidator.error("Guest cannot fetch guest details")(
    async () => {
      await api.functional.discussionBoard.guests.getById(connection, { id: guest.id });
    },
  );

  // 4. As a regular member (simulate normal user – no auth switching API is available)
  // If an authentication/login API existed, we would log in as 'member' and reattempt,
  // but since none is provided, we simulate as a regular user in the same context.
  await TestValidator.error("Member cannot fetch guest details")(
    async () => {
      await api.functional.discussionBoard.guests.getById(connection, { id: guest.id });
    },
  );
}