import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test to verify access control for the moderator user search endpoint.
 *
 * Ensures that both unauthenticated users and users authenticated as
 * standard members (not moderators) cannot access the moderator-only user
 * listing/search endpoint. The endpoint is PATCH
 * /discussionBoard/moderator/users. The test creates a standard user to
 * ensure proper context for permission testing. It also ensures a moderator
 * exists in the system for the required domain context (though that role is
 * not used to access the endpoint in this test).
 *
 * Test process:
 *
 * 1. Register a standard user and save credentials for permission testing.
 * 2. Register a moderator (to fulfill domain context; this account is not used
 *    in permission tests).
 * 3. Attempt to access /discussionBoard/moderator/users (PATCH) as an
 *    UNAUTHENTICATED actor. Expect access denial.
 * 4. Switch to the standard user's authentication context and attempt the
 *    request again. Expect access denial for non-moderator.
 *
 * Successful test confirms that only moderators can access the moderator
 * user search endpoint.
 */
export async function test_api_moderator_user_search_insufficient_permission(
  connection: api.IConnection,
) {
  // 1. Register a standard user and retain credentials for later
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userRegistration = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: userPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userRegistration);

  // 2. Register a moderator (for dependency completeness)
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  // Moderator role is not used for auth testing in this function

  // 3. Attempt search as UNAUTHENTICATED (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to moderator user search is forbidden",
    async () => {
      await api.functional.discussionBoard.moderator.users.index(unauthConn, {
        body: {},
      });
    },
  );

  // 4. Switch to standard user authentication context (token in connection.headers)
  // The previous join has already set the Authorization header for the user
  await TestValidator.error(
    "standard user cannot access moderator user search",
    async () => {
      await api.functional.discussionBoard.moderator.users.index(connection, {
        body: {},
      });
    },
  );
}
