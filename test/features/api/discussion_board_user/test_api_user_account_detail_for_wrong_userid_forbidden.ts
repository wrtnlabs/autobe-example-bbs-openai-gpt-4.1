import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test that a logged-in user cannot view another user's account details.
 *
 * 1. Register a user (user1) using api.functional.auth.user.join and extract
 *    user1's userId.
 * 2. Register a second user (user2), which switches authentication to user2
 *    (api.functional.auth.user.join).
 * 3. As user2, attempt to retrieve user1's details with
 *    api.functional.discussionBoard.user.users.at using user1's id.
 * 4. Assert that the API returns HTTP 403 (forbidden) using
 *    TestValidator.httpError, confirming security policy enforcement.
 * 5. Ensure unique emails and usernames, strong compliant passwords, explicit
 *    consent, and proper DTO usage at every step.
 */
export async function test_api_user_account_detail_for_wrong_userid_forbidden(
  connection: api.IConnection,
) {
  // 1. Register user1 and obtain their userId
  const user1Data = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AaBbCcDdEe123!@#",
    username: RandomGenerator.alphaNumeric(8),
    consent: true,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardUser.ICreate;
  const user1Auth = await api.functional.auth.user.join(connection, {
    body: user1Data,
  });
  typia.assert(user1Auth);
  const user1Id = user1Auth.user.id;

  // 2. Register user2 to switch authentication context
  const user2Data = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "XxYyZzQqWw987$%^",
    username: RandomGenerator.alphaNumeric(8),
    consent: true,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardUser.ICreate;
  const user2Auth = await api.functional.auth.user.join(connection, {
    body: user2Data,
  });
  typia.assert(user2Auth);

  // 3. As user2, attempt to retrieve user1's details
  // This should return HTTP 403 (forbidden) as per security policy
  await TestValidator.httpError(
    "forbid access to other user's account details",
    403,
    async () => {
      await api.functional.discussionBoard.user.users.at(connection, {
        userId: user1Id,
      });
    },
  );
}
