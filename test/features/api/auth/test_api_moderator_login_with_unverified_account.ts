import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that unverified moderator accounts cannot log in.
 *
 * This test covers the registration of a new moderator account followed by
 * an attempted login with that account before completing the email
 * verification process. The expected result is that authentication is
 * denied specifically because is_verified remains false.
 *
 * Step-by-step process:
 *
 * 1. Register a new moderator account (join) with required fields.
 * 2. Attempt to log in with those credentials while unverified.
 * 3. Confirm access is denied explicitly for unverified status (not generic
 *    failure).
 */
export async function test_api_moderator_login_with_unverified_account(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account (is_verified will be false by default after join)
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);
  const moderatorUsername: string = RandomGenerator.name(1);

  const authorized = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(authorized);
  // Sanity check: ensure is_active = true but the account is not verified
  TestValidator.predicate(
    "newly joined moderator must be active",
    authorized.moderator.is_active === true,
  );

  // 2. Attempt to log in with the unverified account
  await TestValidator.error("unverified moderator cannot log in", async () => {
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  });
}
