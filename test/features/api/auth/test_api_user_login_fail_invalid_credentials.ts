import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test that login fails when invalid credentials are provided.
 *
 * This test ensures that the authentication system correctly rejects
 * invalid login attempts, both for existing users with incorrect passwords
 * and for non-existent users. The procedure covers both email and username
 * credential types and checks proper handling of failed logins.
 *
 * 1. Register a valid user via /auth/user/join with unique email and username.
 * 2. Attempt to log in with the correct email but a wrong password—expect
 *    rejection.
 * 3. Attempt to log in with a non-existent email and any password—expect
 *    rejection.
 * 4. Attempt to log in with the correct username but an invalid
 *    password—expect rejection.
 * 5. Attempt to log in with a non-existent username and any password—expect
 *    rejection.
 * 6. For each negative login, wrap the operation in TestValidator.error() to
 *    verify authentication fails.
 *
 * This test covers both the "existing user but wrong credential" and "no
 * such account" branches, and repetition of invalid logins helps exercise
 * audit or rate-limiting policy in a basic way.
 */
export async function test_api_user_login_fail_invalid_credentials(
  connection: api.IConnection,
) {
  // 1. Register a valid user
  const validEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const validUsername: string = RandomGenerator.name(1);
  const validPassword = "ValidPwd!1234";
  const joinResult: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: validEmail,
        username: validUsername,
        password: validPassword,
        consent: true,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(joinResult);

  // 2. Attempt login with correct email, wrong password
  await TestValidator.error(
    "login fails with correct email but wrong password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: validEmail,
          password: "WrongPwd!5678",
        } satisfies IDiscussionBoardUser.ILogin,
      });
    },
  );

  // 3. Attempt login with a non-existent email
  await TestValidator.error("login fails with non-existent email", async () => {
    await api.functional.auth.user.login(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "NoSuchPwd!4321",
      } satisfies IDiscussionBoardUser.ILogin,
    });
  });

  // 4. Attempt login with correct username, wrong password
  await TestValidator.error(
    "login fails with correct username but wrong password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          username: validUsername,
          password: "CompletelyWrong!4321",
        } satisfies IDiscussionBoardUser.ILogin,
      });
    },
  );

  // 5. Attempt login with non-existent username
  await TestValidator.error(
    "login fails with non-existent username",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          username: RandomGenerator.alphaNumeric(12),
          password: "NeverExists!9876",
        } satisfies IDiscussionBoardUser.ILogin,
      });
    },
  );
}
