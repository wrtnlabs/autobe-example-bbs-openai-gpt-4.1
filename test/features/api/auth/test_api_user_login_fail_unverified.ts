import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Verify that login is denied for newly registered users who have not
 * completed email verification.
 *
 * Business context: All users must confirm their email address via a
 * verification process before being granted access to the forum. This test
 * ensures that a user who registers but skips (or hasn't yet completed) the
 * verification process is denied login even when supplying valid
 * credentials. This enforces compliance and prevents premature account
 * use.
 *
 * Test Steps:
 *
 * 1. Register a new user via /auth/user/join with valid email, username,
 *    password, display_name, and consent.
 * 2. Attempt to login via /auth/user/login using the same email and password
 *    before verifying email.
 * 3. Validate that the login is denied (API returns an error) and does not
 *    issue any authentication tokens.
 *
 * This workflow confirms that the system gatekeeps logins until users
 * complete the email verification workflow.
 */
export async function test_api_user_login_fail_unverified(
  connection: api.IConnection,
) {
  // 1. Register a new user account but do NOT complete email verification.
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "!A1";
  const displayName = RandomGenerator.name(1);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);
  // Postcondition: user.user.is_verified === false (by business contract)

  // 2. Attempt to login before email verification is complete
  await TestValidator.error("login is denied for unverified user", async () => {
    await api.functional.auth.user.login(connection, {
      body: { email, password } satisfies IDiscussionBoardUser.ILogin,
    });
  });
}
