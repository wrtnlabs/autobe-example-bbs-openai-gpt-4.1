import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates soft-deleting (deactivation) of one's own user account in the
 * discussion board system.
 *
 * This test ensures that a user can register (join), then delete
 * (soft-delete) their own account using their userId, and after deletion,
 * the user account/profile becomes inaccessible. Specifically:
 *
 * 1. Register as a new user with unique credentials to obtain authorization.
 * 2. Delete the account using the authorized user's own userId via the
 *    soft-delete endpoint.
 * 3. (Optional, depending on available API) Attempt to GET user profile (not
 *    implemented here, since only erase/join is available in SDK)
 * 4. Confirm deletion by checking that the erase endpoint returns successfully
 *    and (if GET existed) that retrieval fails (not implementable here).
 * 5. Confirm that no direct error occurs and that the logical deletion
 *    workflow is compliant.
 */
export async function test_api_user_profile_soft_delete_self(
  connection: api.IConnection,
) {
  // 1. Register a new user to obtain auth context.
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1); // Single word username
  const password = RandomGenerator.alphaNumeric(12) + "A#1"; // Satisfy password policy
  const display_name = RandomGenerator.name();
  const joinResult = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinResult);
  TestValidator.equals(
    "join result email matches input",
    joinResult.user.email,
    email,
  );
  TestValidator.equals(
    "join result username matches input",
    joinResult.user.username,
    username,
  );

  // 2. Soft-delete self using /discussionBoard/user/users/{userId}
  await api.functional.discussionBoard.user.users.erase(connection, {
    userId: joinResult.user.id,
  });
  // No output to assert - if error, it will throw!
  // (No GET /users/{userId} API available: would validate retrieval fails if present)
}
