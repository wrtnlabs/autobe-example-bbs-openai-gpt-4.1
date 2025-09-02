import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate moderator access to user detail API, including permissions,
 * existence checks, and error cases.
 *
 * This test ensures:
 *
 * 1. A joined moderator can successfully access detailed data for an existing
 *    user by userId.
 * 2. Detail lookup for a non-existent userId returns not found (error
 *    expectation).
 * 3. If a user is deleted (simulate by random non-existing uuid), access
 *    returns error (not found or forbidden).
 * 4. Ordinary users (not moderators) cannot use this endpoint and receive
 *    appropriate denial.
 * 5. All information returned for the user is correct and matches created
 *    data.
 *
 * Steps:
 *
 * 1. Register a moderator. Moderator authentication must be established (token
 *    will be stored in connection.headers).
 * 2. Register a regular user (user join). Save the created user's id.
 * 3. As moderator, access /discussionBoard/moderator/users/{userId} with the
 *    valid userId. Assert the retrieved user info matches the registration
 *    payload.
 * 4. Try accessing with a non-existent UUID (typia.random) as userId and
 *    expect error.
 * 5. (Edge case) Try accessing with a deleted user's id (simulate by using a
 *    valid uuid that is not associated with any user).
 * 6. Switch to regular user account, try accessing as non-moderator, and
 *    assert forbidden/error.
 */
export async function test_api_moderator_user_info_access_success_and_permission(
  connection: api.IConnection,
) {
  // Step 1: Register moderator
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modUsername = RandomGenerator.name();
  const modPassword = RandomGenerator.alphaNumeric(12);
  const modDisplay = RandomGenerator.name(2);
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      username: modUsername,
      password: modPassword,
      display_name: modDisplay,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorAuth);

  // Step 2: Register regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userDisplay = RandomGenerator.name(2);
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      display_name: userDisplay,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // Step 3: As moderator, access user detail by ID
  const userDetail = await api.functional.discussionBoard.moderator.users.at(
    connection,
    {
      userId: userAuth.user.id,
    },
  );
  typia.assert(userDetail);

  // Step 4: Validate returned data matches created user
  TestValidator.equals(
    "returned user id matches",
    userDetail.id,
    userAuth.user.id,
  );
  TestValidator.equals(
    "returned email matches",
    userDetail.email,
    userAuth.user.email,
  );
  TestValidator.equals(
    "returned username matches",
    userDetail.username,
    userAuth.user.username,
  );
  TestValidator.equals(
    "returned display_name matches",
    userDetail.display_name ?? undefined,
    userAuth.user.display_name ?? undefined,
  );
  TestValidator.equals(
    "user is_verified is false by default",
    userDetail.is_verified,
    false,
  );
  TestValidator.equals(
    "user is_suspended is false by default",
    userDetail.is_suspended,
    false,
  );
  TestValidator.equals(
    "deleted_at should be null",
    userDetail.deleted_at ?? null,
    null,
  );

  // Step 5: Error on non-existent userId
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "moderator getting non-existent userId should fail",
    async () => {
      await api.functional.discussionBoard.moderator.users.at(connection, {
        userId: nonExistentUserId,
      });
    },
  );

  // Step 6: (Edge case) Deleted userId simulated - not possible to actually delete, simulate with random uuid
  const deletedUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "moderator getting deleted userId should fail",
    async () => {
      await api.functional.discussionBoard.moderator.users.at(connection, {
        userId: deletedUserId,
      });
    },
  );

  // Step 7: Switch to regular user (now connection is authenticated as user)
  await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  // Try accessing as non-moderator
  await TestValidator.error(
    "regular user cannot use moderator user detail endpoint",
    async () => {
      await api.functional.discussionBoard.moderator.users.at(connection, {
        userId: userAuth.user.id,
      });
    },
  );
}
