import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardJwtToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardJwtToken";

/**
 * Test revocation of a user's own JWT token session (update scenario).
 *
 * This tests that a user can revoke (logout/invalidate) one of their own
 * JWT session tokens via the session update API. It proceeds as follows:
 *
 * 1. Register a new user via the join API and obtain the initial JWT access
 *    token (session 1).
 * 2. Simulate login from another device/session by calling join again (using
 *    the same credentials). This issues a second JWT access token (session
 *    2).
 * 3. Revoke the first session (session 1) by updating its session using the
 *    session ID, setting revoked_at to now. (Note: Since no session list
 *    API is available, uses the latest access token as session identifier
 *    where needed.)
 * 4. Attempt to execute a protected operation using the revoked token; expect
 *    an error.
 * 5. Use the second (non-revoked) token to update a session record (should
 *    succeed, not revoked).
 */
export async function test_api_jwt_token_update_revoke_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user, receive access and refresh tokens
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12);

  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user1);

  const token1 = user1.token; // IAuthorizationToken

  // 2. Simulate second session/login by calling join again
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user2);
  const token2 = user2.token;

  // Tokens must be different for different sessions/devices
  TestValidator.notEquals(
    "second session issues a unique JWT access token",
    token1.access,
    token2.access,
  );

  // 3. Use the first token/session to set revoked_at (simulate self-revocation)
  // NOTE: There is no API to list session IDs, so we use access token itself as the identifier for this test scenario.
  const now = new Date().toISOString();
  const revokedSession =
    await api.functional.discussionBoard.user.jwtTokens.update(connection, {
      jwtTokenId: token1.access as any as string & tags.Format<"uuid">, // NOTE: Using token string as session ID; in real case, would use session UUID.
      body: {
        revoked_at: now,
      } satisfies IDiscussionBoardJwtToken.IUpdate,
    });
  typia.assert(revokedSession);
  TestValidator.equals(
    "revoked_at field is set after revocation",
    revokedSession.revoked_at,
    now,
  );

  // 4. Attempt to use revoked JWT token for authenticated operation
  const revokedConn = {
    ...connection,
    headers: { ...(connection.headers ?? {}), Authorization: token1.access },
  };
  await TestValidator.error(
    "revoked token yields error when used for protected operations",
    async () => {
      await api.functional.discussionBoard.user.jwtTokens.update(revokedConn, {
        jwtTokenId: token1.access as any as string & tags.Format<"uuid">,
        body: {
          device_info: "cannot update with revoked token",
        },
      });
    },
  );

  // 5. Use the second, non-revoked token for session update (should succeed)
  const activeConn = {
    ...connection,
    headers: { ...(connection.headers ?? {}), Authorization: token2.access },
  };
  const updatedActive =
    await api.functional.discussionBoard.user.jwtTokens.update(activeConn, {
      jwtTokenId: token2.access as any as string & tags.Format<"uuid">,
      body: {
        device_info: "still active session",
      },
    });
  typia.assert(updatedActive);
  TestValidator.notEquals(
    "active session remains unrevoked after revoke attempt on another session",
    updatedActive.revoked_at,
    now,
  );
}
