import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that an authenticated user can refresh their JWT access/refresh
 * tokens by presenting a valid refresh token.
 *
 * Business context: Secure JWT-based authentication supporting refresh
 * token rotation with all compliance and audit guarantees. The user must be
 * properly registered (with consent), logged in, and supply a valid refresh
 * token for the refresh endpoint to succeed. The refresh operation should
 * return new, non-reused tokens and preserve user/account info.
 *
 * Steps:
 *
 * 1. Register a new user with unique email, username, password, consent true
 *    (creates user in unverified/unsuspended state)
 * 2. Login as the created user with the given email or username to receive an
 *    initial access token and refresh token
 * 3. Use the received refresh token to call the /auth/user/refresh endpoint
 * 4. Verify the response returns a new set of tokens (access and refresh) that
 *    are distinct from the originals
 * 5. Confirm that user summary in the refreshed token response matches the
 *    user identity created and logged in
 *    (id/email/username/display_name/verification/suspension)
 * 6. Assert all returned tokens have correct fields/formats/types according to
 *    DTOs (JWT string, ISO timestamps, etc)
 */
export async function test_api_user_refresh_token_success(
  connection: api.IConnection,
) {
  // 1. Prepare new user registration info
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string =
    RandomGenerator.name(1) + RandomGenerator.alphaNumeric(4);
  const password: string = RandomGenerator.alphaNumeric(12) + "Ab!";
  const displayName: string = RandomGenerator.name();

  // 2. Register the user
  const register = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(register);

  // 3. Login as the new user
  const login = await api.functional.auth.user.login(connection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(login);

  // 4. Call refresh API using the refresh token
  const refresh = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: login.token.refresh,
    } satisfies IDiscussionBoardUser.IRefresh,
  });
  typia.assert(refresh);

  // 5. Validate new tokens are distinct from those returned by login
  TestValidator.notEquals(
    "refreshed access token should differ from original login token",
    refresh.token.access,
    login.token.access,
  );
  TestValidator.notEquals(
    "refreshed refresh token should differ from original login refresh token",
    refresh.token.refresh,
    login.token.refresh,
  );

  // 6. Validate user summary is unchanged and matches
  TestValidator.equals(
    "refreshed user summary matches login summary",
    refresh.user,
    login.user,
  );
  TestValidator.equals(
    "refreshed user summary matches registration",
    refresh.user.email,
    email,
  );
  TestValidator.equals(
    "refreshed user summary matches registration username",
    refresh.user.username,
    username,
  );
  TestValidator.equals(
    "refreshed user summary matches registration display name",
    refresh.user.display_name,
    displayName,
  );
  TestValidator.equals(
    "refreshed user should not be suspended",
    refresh.user.is_suspended,
    false,
  );

  // 7. Check returned token field types and formats
  typia.assert<IDiscussionBoardUser.IAuthorized>(refresh);
  typia.assert<IAuthorizationToken>(refresh.token);
}
