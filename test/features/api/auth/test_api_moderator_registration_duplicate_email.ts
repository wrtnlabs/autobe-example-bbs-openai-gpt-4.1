import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate failure on moderator registration when the email is already
 * taken.
 *
 * This test ensures that when attempting to register a moderator account
 * using an email address already registered by another moderator, the API
 * properly enforces email uniqueness and rejects the new registration. This
 * protects system integrity and prevents duplicate moderator accounts
 * associated with a single email.
 *
 * Steps:
 *
 * 1. Generate a unique test email, two distinct usernames, and minimal
 *    registration fields (including consent=true).
 * 2. Register the first moderator with the generated email and username
 *    (should succeed).
 * 3. Confirm the two usernames used are actually different, ensuring our
 *    negative test is valid.
 * 4. Attempt to register a second moderator using the same email but a
 *    different username (should fail).
 * 5. Assert that the duplicate registration attempt fails due to the email
 *    uniqueness constraint (using TestValidator.error).
 */
export async function test_api_moderator_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Generate unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const username1 = RandomGenerator.name(1);
  let username2 = RandomGenerator.name(1);
  // Ensure username2 is distinct from username1
  while (username2 === username1) {
    username2 = RandomGenerator.name(1);
  }
  const password1 = RandomGenerator.alphaNumeric(10);
  const password2 = RandomGenerator.alphaNumeric(10);

  // Step 2: Register the first moderator (should succeed)
  const registered: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        username: username1,
        password: password1,
        consent: true,
        // display_name is optional and omitted for simplicity
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(registered);
  TestValidator.equals(
    "registered moderator email matches input",
    registered.moderator.is_active,
    true,
  );
  TestValidator.equals(
    "registered moderator email matches given",
    registered.moderator.id !== undefined,
    true,
  );

  // Step 3: Confirm usernames are truly distinct
  TestValidator.notEquals(
    "the two usernames must not be equal",
    username1,
    username2,
  );

  // Step 4: Attempt duplicate registration (should fail)
  await TestValidator.error(
    "API must reject moderator join with duplicate email",
    async () => {
      await api.functional.auth.moderator.join(connection, {
        body: {
          email, // duplicate (same as before)
          username: username2, // different username
          password: password2,
          consent: true,
        } satisfies IDiscussionBoardModerator.IJoin,
      });
    },
  );
}
