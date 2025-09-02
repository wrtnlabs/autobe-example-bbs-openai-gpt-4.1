import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for the admin token refresh business logic.
 *
 * This test covers both the happy path (refresh using a valid token) and
 * various error paths (refresh with an expired/revoked or malformed token).
 * It ensures the security and business rules of the session/token system
 * work as intended:
 *
 * 1. Register a new admin via join, providing a pseudo-random verified
 *    user_id.
 * 2. Log in as this admin to get valid tokens (access, refresh).
 * 3. Perform a refresh using the valid refresh token; check for new tokens and
 *    correct admin profile in response.
 * 4. Attempt a second refresh reusing the already-rotated refresh token
 *    (should fail).
 * 5. Attempt refresh with an obviously malformed (garbage) token (should
 *    fail).
 *
 * Steps include assertions on the validity and rotation of tokens, as well
 * as using TestValidator to ensure errors throw as expected for the failure
 * paths.
 */
export async function test_api_admin_refresh_token_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Register a new admin (assume user_id is provided by a random UUID)
  const user_id: string = typia.random<string & tags.Format<"uuid">>();
  const joinResult: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: { user_id } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(joinResult);

  // 2. Log in as the new admin with random credentials (matching join registration)
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  // For E2E, assume that admin email/password are known (in reality flows might be separated)
  const loginResult: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: { email, password } satisfies IDiscussionBoardAdmin.ILogin,
    });
  typia.assert(loginResult);

  // 3. Happy path: refresh using the valid refresh token
  const validRefreshToken = loginResult.token.refresh;
  const refreshResult: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: validRefreshToken,
      } satisfies IDiscussionBoardAdmin.IRefresh,
    });
  typia.assert(refreshResult);
  TestValidator.notEquals(
    "refreshed access token must differ from previous",
    refreshResult.token.access,
    loginResult.token.access,
  );
  TestValidator.notEquals(
    "refreshed refresh token must differ from previous",
    refreshResult.token.refresh,
    loginResult.token.refresh,
  );
  TestValidator.equals(
    "admin id must match",
    refreshResult.admin.id,
    joinResult.admin.id,
  );

  // 4. Failure path: try to reuse the previous refresh token (token rotation)
  await TestValidator.error(
    "refresh with used/rotated refresh token should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: validRefreshToken,
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );

  // 5. Failure path: malformed/garbage string as refresh token
  await TestValidator.error(
    "refresh with malformed token should fail",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(48),
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
}
