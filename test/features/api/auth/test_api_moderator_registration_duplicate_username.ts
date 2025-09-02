import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test rejection of moderator sign-up with a duplicate username.
 *
 * This test ensures that the moderator registration API properly enforces
 * the uniqueness constraint on usernames, by:
 *
 * 1. Registering a first moderator using unique email/username/password
 * 2. Verifying successful registration and that the record is active
 * 3. Attempting to register a second moderator with the same username but
 *    different email/password
 * 4. Expecting an error (uniqueness enforcement)
 */
export async function test_api_moderator_registration_duplicate_username(
  connection: api.IConnection,
) {
  // 1. Register the initial moderator
  const uniqueUsername = RandomGenerator.alphabets(10);
  const firstEmail = `${RandomGenerator.alphabets(7)}@example.com`;
  const firstPassword = RandomGenerator.alphaNumeric(12);
  const result = await api.functional.auth.moderator.join(connection, {
    body: {
      email: firstEmail,
      username: uniqueUsername,
      password: firstPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(result);
  TestValidator.equals(
    "moderator is active after registration",
    result.moderator.is_active,
    true,
  );

  // 2. Attempt duplicate sign-up with same username (different email)
  const secondEmail = `${RandomGenerator.alphabets(7)}@test.com`;
  const secondPassword = RandomGenerator.alphaNumeric(12);
  await TestValidator.error(
    "system rejects duplicate moderator usernames",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email: secondEmail,
          username: uniqueUsername, // duplicate username
          password: secondPassword,
          consent: true,
        } satisfies IDiscussionBoardModerator.IJoin,
      });
    },
  );
}
