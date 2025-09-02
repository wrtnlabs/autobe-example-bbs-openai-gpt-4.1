import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Confirm that non-admin actors are forbidden from deleting verification
 * tokens.
 *
 * This end-to-end test ensures that a regular (non-admin) user cannot
 * invoke the admin-only verification token erase endpoint, regardless of
 * what verification token ID they specify. It is a negative test for access
 * control compliance.
 *
 * Workflow:
 *
 * 1. Register a new user as a regular member using the user join endpoint.
 * 2. As this non-admin user, attempt to invoke the delete (soft delete)
 *    operation for a verification token (using a random UUID as the token
 *    ID).
 * 3. The system must deny access, returning a forbidden/unauthorized error and
 *    preventing any modification to verification tokens by non-admins.
 *
 * This scenario validates enforcement of RBAC (role-based access control)
 * for sensitive verification token operations.
 */
export async function test_api_verification_token_soft_delete_forbidden_non_admin(
  connection: api.IConnection,
) {
  // 1. Register as a standard user (non-admin)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name(1);
  const userPassword = "TestPassword1!";

  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // 2. Attempt to delete a verification token (admin endpoint) as non-admin
  const randomVerificationTokenId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "non-admin cannot delete verification tokens (should be forbidden)",
    async () => {
      await api.functional.discussionBoard.admin.verificationTokens.erase(
        connection,
        { verificationTokenId: randomVerificationTokenId },
      );
    },
  );
}
