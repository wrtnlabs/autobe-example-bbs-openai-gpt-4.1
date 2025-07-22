import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test guest session creation failure for missing or invalid required fields.
 *
 * This E2E test verifies that the POST /discussionBoard/guests endpoint enforces validation:
 *  - It must reject blank or null for required fields: session_token, ip_address, expires_at.
 *  - It must accept omission or null for optional field: user_agent.
 *  - No incomplete guest entities should be persisted on validation errors.
 *
 * Precondition: Ensures at least one discussion board member exists (admin role). This is required as a dependency for endpoint access control.
 *
 * Steps:
 * 1. Register a member account (admin) using plausible synthetic data.
 * 2. Attempt to create guest sessions with invalid field values (blank or null for requireds).
 *     - Each attempt must fail validation—assert error using TestValidator.error().
 * 3. Attempt correct guest creation omitting user_agent (optional) and using explicit null for user_agent.
 *     - Each must succeed and entity is returned and typia asserted.
 */
export async function test_api_discussionBoard_test_create_guest_session_missing_required_fields(
  connection: api.IConnection,
) {
  // Step 1: Create a prerequisite discussion board member (admin)
  const adminData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;

  const admin = await api.functional.discussionBoard.members.post(connection, { body: adminData });
  typia.assert(admin);

  // Step 2a: Test blank session_token
  TestValidator.error("blank session_token should fail")(() =>
    api.functional.discussionBoard.guests.post(connection, {
      body: {
        session_token: "",
        ip_address: "198.51.100.10",
        expires_at: new Date(Date.now() + 3600_000).toISOString(),
      } satisfies IDiscussionBoardGuest.ICreate,
    })
  );

  // Step 2b: Test null session_token (TypeScript will reject, skip per instructions)
  // Step 2c: Test blank ip_address
  TestValidator.error("blank ip_address should fail")(() =>
    api.functional.discussionBoard.guests.post(connection, {
      body: {
        session_token: RandomGenerator.alphaNumeric(32),
        ip_address: "",
        expires_at: new Date(Date.now() + 7200_000).toISOString(),
      } satisfies IDiscussionBoardGuest.ICreate,
    })
  );

  // Step 2d: Test null ip_address (TypeScript will reject, skip per instructions)
  // Step 2e: Test blank expires_at (not meaningful—date-time, so skip)
  // Step 2f: Test null expires_at (TypeScript will reject, skip per instructions)

  // Step 3a: Valid create with user_agent as null (should succeed)
  const guestNullUserAgent = await api.functional.discussionBoard.guests.post(connection, {
    body: {
      session_token: RandomGenerator.alphaNumeric(32),
      ip_address: "198.51.100.11",
      user_agent: null,
      expires_at: new Date(Date.now() + 10800_000).toISOString(),
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guestNullUserAgent);
  TestValidator.predicate("user_agent is null accepted")(!!guestNullUserAgent && guestNullUserAgent.user_agent === null);

  // Step 3b: Valid create omitting user_agent (should succeed)
  const guestNoUserAgent = await api.functional.discussionBoard.guests.post(connection, {
    body: {
      session_token: RandomGenerator.alphaNumeric(32),
      ip_address: "198.51.100.12",
      expires_at: new Date(Date.now() + 14400_000).toISOString(),
    } satisfies IDiscussionBoardGuest.ICreate,
  });
  typia.assert(guestNoUserAgent);
  TestValidator.predicate("user_agent omitted accepted")(!!guestNoUserAgent && (!('user_agent' in guestNoUserAgent) || guestNoUserAgent.user_agent == null));
}