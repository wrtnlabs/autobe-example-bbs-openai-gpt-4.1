import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_user_registration_email_uniqueness(
  connection: api.IConnection,
) {
  /**
   * Test that email uniqueness constraint is enforced at registration.
   *
   * Scenario steps:
   *
   * 1. Register a user with a unique, random email (dependency step).
   * 2. Attempt to register a second user using the same email but different
   *    username.
   * 3. Assert the first registration succeeds and email matches input.
   * 4. Assert the second registration fails due to duplicate email (uniqueness
   *    constraint).
   *
   * Notes:
   *
   * - Passwords are created to satisfy policy (12+ chars, uppercase, number,
   *   special).
   * - Usernames and display_name are distinct for each user (randomized).
   */
  // Step 1: Register initial user with unique email
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userRegPayload1 = {
    email,
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12) + ".A1!", // Meets password rules
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;

  const firstUser = await api.functional.auth.user.join(connection, {
    body: userRegPayload1,
  });
  typia.assert(firstUser);
  TestValidator.equals(
    "created user email matches input",
    firstUser.user.email,
    email,
  );

  // Step 2: Attempt to register second user with same email
  const userRegPayload2 = {
    email, // duplicate email
    username: RandomGenerator.name(), // different username
    password: RandomGenerator.alphaNumeric(12) + ".B2@", // different, valid password
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;

  await TestValidator.error(
    "should fail registering with duplicate email",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: userRegPayload2,
      });
    },
  );
}
