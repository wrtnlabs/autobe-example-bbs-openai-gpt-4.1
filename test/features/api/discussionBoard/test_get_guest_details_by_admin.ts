import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate administrator access to retrieve specific guest session details by UUID.
 *
 * This test ensures that an administrator (or moderator-level) member can fetch details for any guest session (discussionBoard/guests/{id}). It verifies end-to-end that the resource can be created, looked up, and retrieved according to audit/compliance flows. The workflow intentionally checks (a) successful fetch with full entity match and (b) error handling for a non-existent UUID.
 *
 * Steps:
 * 1. Register a new member (to simulate an admin – role enforcement is implied by access control, but no explicit property difference here)
 * 2. Create a guest session entity (so we have a real entity with known data)
 * 3. Retrieve the guest by ID as the member (simulating admin capacity)
 * 4. Assert full-field match (all atomic properties)
 * 5. Attempt a fetch with a random, non-existent UUID and confirm 404/Not Found error
 */
export async function test_api_discussionBoard_guests_getById(
  connection: api.IConnection,
) {
  // 1. Register an admin (simulated via normal member registration)
  const memberInput = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(32),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const adminMember = await api.functional.discussionBoard.members.post(connection, {
    body: memberInput,
  });
  typia.assert(adminMember);

  // 2. Create a guest session
  const guestInput = {
    session_token: RandomGenerator.alphaNumeric(32),
    ip_address: `192.168.1.${typia.random<number & tags.Type<"uint32"> & tags.Maximum<254>>()}`,
    user_agent: RandomGenerator.alphaNumeric(16),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // expires in 1 hour
  } satisfies IDiscussionBoardGuest.ICreate;
  const guestCreated = await api.functional.discussionBoard.guests.post(connection, {
    body: guestInput,
  });
  typia.assert(guestCreated);

  // 3. Retrieve guest by ID
  const guestFetched = await api.functional.discussionBoard.guests.getById(connection, {
    id: guestCreated.id,
  });
  typia.assert(guestFetched);

  // 4. Assert all atomic properties match
  TestValidator.equals("guest id matches")(guestFetched.id)(guestCreated.id);
  TestValidator.equals("session_token matches")(guestFetched.session_token)(guestCreated.session_token);
  TestValidator.equals("ip_address matches")(guestFetched.ip_address)(guestCreated.ip_address);
  TestValidator.equals("user_agent matches")(guestFetched.user_agent)(guestCreated.user_agent);
  TestValidator.equals("expires_at matches")(guestFetched.expires_at)(guestCreated.expires_at);
  TestValidator.equals("created_at type")(typeof guestFetched.created_at)("string");

  // 5. Try non-existent guest id and verify error
  await TestValidator.error("non-existent guest should 404 error")(
    async () => {
      await api.functional.discussionBoard.guests.getById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(), // Unlikely to exist
      });
    },
  );
}