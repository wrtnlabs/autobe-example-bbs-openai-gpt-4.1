import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test creating a new guest session with valid data.
 *
 * Business context:
 * - Guests sessions are tracked for analytics, moderation, and security compliance. Only administrator users are permitted to create guest sessions (per dependency).
 * - Data includes session token, IP address, optional user-agent, and explicit session expiration timestamp, as per audit and analytic requirements.
 *
 * Step-by-step process:
 * 1. Create an administrator account (dependency: only admins may create guest sessions).
 * 2. Use the administrator connection to create a new guest session with valid data (token, IP, user agent, expiration).
 * 3. Assert that a guest session is created and returned with all required fields populated per the DTO contract, including audit fields (id, created_at, expires_at, etc.).
 * 4. Validate that fields match input and are correctly typed/formatted.
 */
export async function test_api_discussionBoard_test_create_guest_session_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create an administrator account (dependency).
  const adminInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const admin: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 2. Use admin privileges to create a guest session
  const guestInput: IDiscussionBoardGuest.ICreate = {
    session_token: RandomGenerator.alphaNumeric(32),
    ip_address: "203.0.113.42",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Expires in 1 hour
  };
  const guest: IDiscussionBoardGuest = await api.functional.discussionBoard.guests.post(connection, {
    body: guestInput,
  });
  typia.assert(guest);
  // 3. Assert all required/audit fields are present and correctly formatted
  TestValidator.equals("session_token")(guest.session_token)(guestInput.session_token);
  TestValidator.equals("ip_address")(guest.ip_address)(guestInput.ip_address);
  TestValidator.equals("user_agent")(guest.user_agent)(guestInput.user_agent);
  TestValidator.equals("expires_at")(guest.expires_at)(guestInput.expires_at);
  TestValidator.predicate("id is uuid")(
    typeof guest.id === "string" && guest.id.length > 0 && /[0-9a-fA-F-]{36}/.test(guest.id)
  );
  TestValidator.predicate("created_at is ISO date")(
    typeof guest.created_at === "string" && !isNaN(Date.parse(guest.created_at))
  );
}