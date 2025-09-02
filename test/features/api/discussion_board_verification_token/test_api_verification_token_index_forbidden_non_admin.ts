import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVerificationToken";
import type { IPageIDiscussionBoardVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardVerificationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that non-admin users are forbidden from accessing the
 * verification token index endpoint (PATCH
 * /discussionBoard/admin/verificationTokens).
 *
 * Business context:
 *
 * - This scenario ensures sensitive verification/audit data is never exposed
 *   to general users, maintaining the least privilege boundary.
 *
 * Workflow:
 *
 * 1. Register a normal user using /auth/user/join. This auto-authenticates the
 *    connection as a non-admin user.
 * 2. Attempt to access the verification token index endpoint (PATCH
 *    /discussionBoard/admin/verificationTokens) while logged in as a
 *    non-admin user, submitting an empty filter body.
 * 3. Assert a forbidden/permission denied error is thrown, confirming that the
 *    access control is enforced and sensitive data is not exposed.
 *
 * This test verifies that only properly authenticated admin users have
 * access to verification token audit endpoints, preventing information
 * leaks.
 */
export async function test_api_verification_token_index_forbidden_non_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a standard (non-admin) user and auto-login
  // Password policy: 10+ chars, includes uppercase, number, special char
  const userInput: IDiscussionBoardUser.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12) + "Aa$", // Force policy: 12 rand + 1 uppercase, 1 number, 1 special
    display_name: RandomGenerator.name(1), // Optional field
    consent: true,
  };
  const userAuth = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(userAuth);

  // Step 2: Attempt forbidden access as a non-admin to the admin endpoint
  await TestValidator.error(
    "non-admin users forbidden from verification token index",
    async () => {
      await api.functional.discussionBoard.admin.verificationTokens.index(
        connection,
        {
          body: {}, // Empty filter/search body
        },
      );
    },
  );
}
