import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that updating a non-existent discussion board guest session by UUID fails as expected.
 *
 * Business rationale:
 * - Only administrators or system bots may attempt to update guest sessions.
 * - Updates to non-existent guest sessions (invalid UUIDs) should fail with an error (usually 404 Not Found),
 *   as per robust audit and abuse-prevention requirements. The failure must NOT mutate or create any new guest session data.
 *
 * Steps:
 * 1. Set up: Register an administrator member (dependency for potential auth enforcement and to confirm no user-side effects).
 * 2. Generate a UUID that does not correspond to any existing guest session (guaranteed never to exist via randomness).
 * 3. Attempt to update guest session using this UUID, with valid update data.
 * 4. Validate: Confirm that the operation fails (e.g., 404 or equivalent error), and does NOT create or change guest session data.
 */
export async function test_api_discussionBoard_test_update_guest_session_nonexistent_id_failure(
  connection: api.IConnection,
) {
  // 1. Ensure an administrator member exists
  const createAdmin = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(20),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(createAdmin);

  // 2. Use a guaranteed-nonexistent UUID for guest session
  const nonexistentGuestId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to update this nonexistent guest session
  await TestValidator.error("Updating nonexistent guest must fail")(
    async () => {
      await api.functional.discussionBoard.guests.putById(connection, {
        id: nonexistentGuestId,
        body: {
          user_agent: RandomGenerator.alphaNumeric(20),
          expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        } satisfies IDiscussionBoardGuest.IUpdate,
      });
    }
  );
  // 4. No explicit post-update confirmation possible since guest entity does not exist and no search API is available.
}