import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate that an administrator can update an existing guest session to change its expiration or user agent details.
 *
 * This test ensures:
 * - A guest session can be created successfully for update operations.
 * - An administrator user exists (for update privilege; implied by API, though not direct auth in the input set).
 * - When the guest session is updated (user agent and/or expires_at), the returned entity has updated fields reflecting the input changes.
 * - All non-updated fields remain unchanged.
 *
 * Test steps:
 * 1. Create a new guest session with defined properties (session_token, ip_address, user_agent, expires_at).
 * 2. Register a new administrator member (registration required for dependency).
 * 3. Prepare update details with a new (future) expires_at and/or user_agent string.
 * 4. Update the guest session using its ID and new update details.
 * 5. Assert that the guest session entity returned by the update call:
 *    - Has the same id/session_token/ip_address/created_at as before.
 *    - Reflects the new expires_at and/or user_agent value(s).
 *    - Does not mutate fields it should not (id, session_token, ip_address, created_at).
 */
export async function test_api_discussionBoard_guests_test_update_guest_session_expiration_success(
  connection: api.IConnection,
) {
  // 1. Create a guest session
  const initialGuest = await api.functional.discussionBoard.guests.post(connection, {
    body: {
      session_token: RandomGenerator.alphaNumeric(24),
      ip_address: "192.168.1.100",
      user_agent: "Mozilla/5.0 (Linux; Android 10)",
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(initialGuest);

  // 2. Register an administrator member (dependency setup, no auth step per available API)
  const adminMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(24),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(adminMember);

  // 3. Prepare guest session update details
  const updatedExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(); // 4 hours later
  const updatedUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_3 like Mac OS X)";

  // 4. Update the guest session
  const updatedGuest = await api.functional.discussionBoard.guests.putById(connection, {
    id: initialGuest.id,
    body: {
      expires_at: updatedExpiresAt,
      user_agent: updatedUserAgent,
    } satisfies IDiscussionBoardGuest.IUpdate,
  });
  typia.assert(updatedGuest);

  // 5. Validate the outcome (track only available properties)
  TestValidator.equals("guest session id unchanged")(updatedGuest.id)(initialGuest.id);
  TestValidator.equals("session_token unchanged")(updatedGuest.session_token)(initialGuest.session_token);
  TestValidator.equals("ip_address unchanged")(updatedGuest.ip_address)(initialGuest.ip_address);
  TestValidator.equals("user_agent updated")(updatedGuest.user_agent)(updatedUserAgent);
  TestValidator.equals("expires_at updated")(updatedGuest.expires_at)(updatedExpiresAt);
  TestValidator.equals("created_at unchanged")(updatedGuest.created_at)(initialGuest.created_at);
}