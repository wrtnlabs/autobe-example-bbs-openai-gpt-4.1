import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Successfully update mutable fields (display_name and username) of a user
 * profile.
 *
 * This test verifies the correct operation of the user profile update
 * endpoint:
 *
 * - Registers a new user (using POST /auth/user/join)
 * - Authenticates as this user (SDK manages tokens automatically)
 * - Updates the user's display_name and username via PUT
 *   /discussionBoard/user/users/{userId}
 * - Verifies that the updated values persist and only allowed fields changed
 * - Asserts that critical/protected fields remain unchanged and cannot be
 *   updated via this endpoint
 *
 * Steps:
 *
 * 1. Register a user with unique email, username, password, and consent
 * 2. Update display_name and username with new values
 * 3. Assert that the response includes new display_name/username and unchanged
 *    critical fields
 */
export async function test_api_user_profile_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(14) + "A!1", // ensure valid complexity
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const joinResult = await api.functional.auth.user.join(connection, {
    body: joinData,
  });
  typia.assert(joinResult);
  const userId = joinResult.user.id;
  const originalEmail = joinResult.user.email;
  const originalIsVerified = joinResult.user.is_verified;
  const originalIsSuspended = joinResult.user.is_suspended;

  // 2. Prepare unique values for update (simulate profile edit by the user)
  const updateInput = {
    display_name: RandomGenerator.name(),
    username: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardUser.IUpdate;

  // 3. Update the user's profile (display_name and username)
  const updated = await api.functional.discussionBoard.user.users.update(
    connection,
    {
      userId,
      body: updateInput,
    },
  );
  typia.assert(updated);
  // 4. Validate changes were applied, and critical fields were not altered
  TestValidator.equals(
    "display_name updated",
    updated.display_name,
    updateInput.display_name,
  );
  TestValidator.equals(
    "username updated",
    updated.username,
    updateInput.username,
  );
  TestValidator.equals("email not mutated", updated.email, originalEmail);
  TestValidator.equals(
    "is_verified unchanged",
    updated.is_verified,
    originalIsVerified,
  );
  TestValidator.equals(
    "is_suspended unchanged",
    updated.is_suspended,
    originalIsSuspended,
  );
  TestValidator.equals("deleted_at remains null", updated.deleted_at, null);

  // 5. No unauthorized fields can be mutated through this endpoint (password hash, suspension, deletion, etc)
  //    This is implicitly validated, as the DTO/schema does not allow such changes here.
}
