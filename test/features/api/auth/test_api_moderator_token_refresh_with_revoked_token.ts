import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test failed moderator token refresh with revoked/invalid refresh token.
 *
 * This test validates that the system does not allow session extension with
 * a revoked (or otherwise invalid) refresh token. It ensures that,
 * following security best practices, the refresh endpoint strictly enforces
 * the validity and activity of refresh tokens.
 *
 * Steps:
 *
 * 1. Register a new moderator with unique credentials
 *    (email/username/password).
 * 2. (If needed) Simulate email/account verification to ensure login is
 *    possible (skipped if auto-verified on registration).
 * 3. Login as moderator with correct credentials and obtain the refresh token
 *    from the response.
 * 4. Attempt to refresh using an intentionally invalid (simulated "revoked")
 *    refresh token.
 * 5. Validate that the refresh endpoint returns an error (e.g., 401/403) and
 *    does not grant a new session or tokens.
 *
 * This workflow assures compliance with secure authentication token
 * lifecycle handling for moderator accounts.
 */
export async function test_api_moderator_token_refresh_with_revoked_token(
  connection: api.IConnection,
) {
  // 1. Register a new moderator account
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12),
    consent: true,
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardModerator.IJoin;
  const joinResult = await api.functional.auth.moderator.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);

  // 2. Login as the moderator to get valid tokens
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IDiscussionBoardModerator.ILogin;
  const loginResult = await api.functional.auth.moderator.login(connection, {
    body: loginInput,
  });
  typia.assert(loginResult);
  const refreshToken = loginResult.token.refresh;

  // 3. Attempt to refresh session using an intentionally revoked/invalid refresh token
  const fakeRevokedRefreshToken =
    "revoked_token_" + RandomGenerator.alphaNumeric(32);
  await TestValidator.error(
    "refresh should fail with revoked or tampered token",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: fakeRevokedRefreshToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );
}
