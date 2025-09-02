import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Verifies that non-admin users are forbidden from retrieving password
 * reset details via the admin endpoint.
 *
 * The purpose of this test is to ensure that only users with administrator
 * privileges can access detailed information about password reset records
 * using the /discussionBoard/admin/passwordResets/{passwordResetId}
 * endpoint. Standard (non-admin) users must not be able to retrieve these
 * records; any such attempt should result in a permission-denied error.
 *
 * The workflow for this test is as follows:
 *
 * 1. Register and authenticate a standard user via /auth/user/join.
 * 2. Attempt to retrieve a password reset record using GET
 *    /discussionBoard/admin/passwordResets/{passwordResetId} with the
 *    non-admin authentication.
 * 3. Assert that the operation fails with a forbidden or authorization error,
 *    confirming that standard users cannot access admin-level resources.
 */
export async function test_api_password_reset_retrieval_forbidden_non_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a standard user
  const userInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(14) + "A!1", // ensures password meets policy (min 10 chars, upper/special/number)
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const userAuth = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(userAuth);

  // Step 2: Attempt admin-only endpoint using non-admin context
  await TestValidator.error(
    "standard user forbidden from accessing admin password reset details",
    async () => {
      await api.functional.discussionBoard.admin.passwordResets.at(connection, {
        passwordResetId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
