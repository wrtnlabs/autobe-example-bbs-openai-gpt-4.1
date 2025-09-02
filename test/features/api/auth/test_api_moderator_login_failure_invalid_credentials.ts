import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test login failure when using invalid moderator credentials.
 *
 * Validates that system rejects login attempts with incorrect moderator
 * passwords, even after the moderator account has been successfully
 * registered. Ensures strong authentication enforcement, and protects
 * moderator accounts from brute-force attacks or credential stuffing
 * risks.
 *
 * 1. Register a new moderator account using the join endpoint.
 * 2. Simulate account verification (system is assumed to mark as verified for
 *    this workflow).
 * 3. Attempt to log in with the correct email and an incorrect password.
 * 4. Confirm that the login fails with an authentication error.
 * 5. Optionally, validate (via business requirements) that this event would be
 *    audit logged.
 */
export async function test_api_moderator_login_failure_invalid_credentials(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account
  const moderatorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    consent: true,
  } satisfies IDiscussionBoardModerator.IJoin;
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: moderatorJoinInput,
  });
  typia.assert(moderatorAuth);

  // 2. Simulate account verification (assume verified for login purposes)
  // (No explicit step as API does not surface verification endpoint or status override)

  // 3. Attempt login with the correct email but an invalid password
  const loginInput = {
    email: moderatorJoinInput.email,
    password: RandomGenerator.alphaNumeric(12), // Deliberately wrong
  } satisfies IDiscussionBoardModerator.ILogin;
  await TestValidator.error(
    "login should fail with invalid moderator password",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: loginInput,
      });
    },
  );
}
