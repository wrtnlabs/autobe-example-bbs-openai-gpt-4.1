import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test rejection of refresh token requests for revoked or invalid tokens.
 *
 * This test validates that the /auth/user/refresh endpoint refuses refresh
 * attempts when provided tokens are revoked, syntactically incorrect, or
 * otherwise invalid. It ensures that session extension is not possible
 * using an old or manipulated refresh token, providing security against
 * replay and forged tokens.
 *
 * Test steps:
 *
 * 1. Register a new user, consenting to terms, and capture issued refresh
 *    token.
 * 2. Log in as the same user to obtain a fresh access/refresh token pair (the
 *    previous registration-issued refresh should now be revoked).
 * 3. Attempt refresh using: a. A completely random garbage string. b. An
 *    expired or revoked refresh token (the older registration token, if
 *    possible). c. A syntactically valid, but unissued/unknown token (e.g.,
 *    128-length alphanumeric).
 * 4. For each invalid attempt, confirm the endpoint responds with a relevant
 *    error and no new access token is granted.
 * 5. Edge case: attempt with empty string or null (if DTO permits), and
 *    confirm proper rejection.
 */
export async function test_api_user_refresh_token_fail_revoked_or_invalid(
  connection: api.IConnection,
) {
  // 1. Register a user and obtain the issued refresh token
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(16);

  const regResult = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(regResult);
  TestValidator.predicate(
    "registration returns a refresh token",
    typeof regResult.token.refresh === "string" &&
      regResult.token.refresh.length > 0,
  );

  const originalRefreshToken = regResult.token.refresh;

  // 2. Log in again to get a new refresh token, which revokes the old one
  const loginResult = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(loginResult);
  TestValidator.predicate(
    "login returns fresh refresh token",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );

  const newRefreshToken = loginResult.token.refresh;

  // 3a. Attempt refresh with a completely random/invalid token
  await TestValidator.error(
    "refresh with random garbage token is rejected",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(256),
        } satisfies IDiscussionBoardUser.IRefresh,
      });
    },
  );

  // 3b. Attempt refresh with the original (now revoked) refresh token
  await TestValidator.error(
    "refresh with revoked registration token is rejected",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies IDiscussionBoardUser.IRefresh,
      });
    },
  );

  // 3c. Attempt refresh with a syntactically valid but unknown refresh token
  const fakeToken = RandomGenerator.alphaNumeric(newRefreshToken.length);
  await TestValidator.error(
    "refresh with syntactically valid but unissued token is rejected",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: fakeToken,
        } satisfies IDiscussionBoardUser.IRefresh,
      });
    },
  );

  // 4. Attempt refresh with empty string (should be rejected)
  await TestValidator.error(
    "refresh with empty string as token is rejected",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: { refresh_token: "" } satisfies IDiscussionBoardUser.IRefresh,
      });
    },
  );

  // 5. (Edge) If the endpoint permits, test null or omitting the refresh_token (should fail serialization or validation)
  // (SKIPPED: TypeScript DTO requires non-null string, so we cannot pass null/undefined without causing type error)
}
