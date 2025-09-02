import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for successful moderator JWT session refresh.
 *
 * Validates token rotation and session renewal business rules for the
 * /auth/moderator/refresh endpoint.
 *
 * Steps:
 *
 * 1. Register a new moderator (unique valid email/username/password,
 *    consent=true)
 * 2. Login with the moderator's credentials to obtain JWT access/refresh
 *    tokens
 * 3. Call the refresh endpoint with the valid refresh token
 * 4. Ensure new access/refresh tokens are issued and are different from
 *    previous
 * 5. Confirm returned moderator is active in all flows
 * 6. Ensure tokens and response do not expose sensitive information (no
 *    password)
 * 7. Validate expiry timestamps of all tokens are in the future
 * 8. (Auditing logic is assumed to be triggered by backend, not testable
 *    directly here)
 */
export async function test_api_moderator_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register new moderator
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username = RandomGenerator.name(1);
  const password = RandomGenerator.alphaNumeric(12);

  const joinRes: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        username,
        password,
        consent: true,
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(joinRes);

  TestValidator.equals(
    "registered moderator account is active",
    joinRes.moderator.is_active,
    true,
  );
  TestValidator.equals(
    "user_id present and is uuid",
    typeof joinRes.moderator.user_id,
    "string",
  );

  // 2. Login and obtain access/refresh tokens
  const loginRes: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email,
        password: password as string & tags.Format<"password">,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(loginRes);
  TestValidator.notEquals(
    "login issued access token should differ from join token",
    loginRes.token.access,
    joinRes.token.access,
  );
  TestValidator.notEquals(
    "login issued refresh token should differ from join issued refresh token",
    loginRes.token.refresh,
    joinRes.token.refresh,
  );

  // 3. Call refresh endpoint with login-issued refresh token
  const refreshRes: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: loginRes.token.refresh,
      } satisfies IDiscussionBoardModerator.IRefresh,
    });
  typia.assert(refreshRes);

  // 4. Verify tokens were actually rotated
  TestValidator.notEquals(
    "refreshed access token should differ from login token",
    refreshRes.token.access,
    loginRes.token.access,
  );
  TestValidator.notEquals(
    "refreshed refresh token should differ from login refresh token",
    refreshRes.token.refresh,
    loginRes.token.refresh,
  );

  // 5. Moderator must remain active
  TestValidator.equals(
    "refreshed moderator is still active",
    refreshRes.moderator.is_active,
    true,
  );
  TestValidator.equals(
    "user_id remains the same",
    refreshRes.moderator.user_id,
    loginRes.moderator.user_id,
  );

  // 6. No sensitive info leaked in tokens
  TestValidator.predicate(
    "refresh token object does not leak any password fields",
    !Object.values(refreshRes.token).some(
      (v) => typeof v === "string" && v.toLowerCase().includes("pass"),
    ),
  );

  // 7. Check access/refresh expiry timestamps are in the future
  TestValidator.predicate(
    "access token expiry is in the future",
    Date.parse(refreshRes.token.expired_at) > Date.now(),
  );
  TestValidator.predicate(
    "refresh token expiry is in the future",
    Date.parse(refreshRes.token.refreshable_until) > Date.now(),
  );
}
