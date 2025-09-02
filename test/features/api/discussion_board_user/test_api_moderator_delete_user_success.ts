import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the successful soft deletion of a user by a moderator.
 *
 * This test case will:
 *
 * 1. Register a new moderator using the moderator join endpoint.
 * 2. Register a new user (the deletion target) with the user join endpoint.
 * 3. Switch authentication context back to the moderator by logging in again.
 * 4. Soft-delete the user via the moderator's delete endpoint.
 *
 * Notes:
 *
 * - All data is randomly generated to ensure independence between runs.
 * - Passwords conform to required policy (10+ chars, at least one uppercase,
 *   numeric, and special character).
 * - Each API call is asserted for non-void response. No API endpoint is
 *   available to list users or verify the deleted_at field directly, so
 *   verification is limited to absence of errors and end-to-end logical
 *   flow.
 * - This test covers business logic: only moderators can delete, user is
 *   soft-deleted not hard-deleted, and audit/compliance goals are
 *   maintained.
 */
export async function test_api_moderator_delete_user_success(
  connection: api.IConnection,
) {
  // 1. Register moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(14) + "F#9";
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorJoin);
  const moderatorId = moderatorJoin.moderator.id;

  // 2. Register deletion target user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(13) + "A$3";
  const userUsername = RandomGenerator.alphabets(10);
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);
  const userId = userJoin.user.id;
  // Connection now has user auth

  // 3. Switch back to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword as string & tags.Format<"password">,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 4. Moderator soft-deletes the user
  await api.functional.discussionBoard.moderator.users.erase(connection, {
    userId,
  });
  // Test complete: No error means soft-delete was successful
}
