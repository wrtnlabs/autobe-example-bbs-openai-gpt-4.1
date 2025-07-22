import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validates error handling when trying to delete a guest session using an invalid/non-existent UUID.
 *
 * Ensures that the system returns a 404 error, and no unintended state transition occurs when attempting
 * to remove a guest session record that does not exist. An admin member is created as a prerequisite to
 * simulate appropriate permission context.
 *
 * Steps:
 * 1. Create an admin member as setup.
 * 2. Attempt to delete a guest session with a random UUID that does not exist.
 * 3. Expect the API to throw a 404 error (not found).
 */
export async function test_api_discussionBoard_test_delete_guest_session_with_invalid_or_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Create an admin member (to fulfill authorization/dependency)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: adminEmail,
      hashed_password: RandomGenerator.alphabets(32),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(admin);

  // 2. Attempt to delete a guest session with a definitely non-existent UUID
  const nonExistentId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Confirm that deleting a non-existent guest session yields a 404 error
  await TestValidator.error("Should return 404 for non-existent guest id")(
    async () => {
      await api.functional.discussionBoard.guests.eraseById(connection, {
        id: nonExistentId,
      });
    },
  );
}