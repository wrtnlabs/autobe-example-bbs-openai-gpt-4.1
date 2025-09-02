import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for soft deleting refresh tokens as admin: not-found and
 * forbidden scenarios.
 *
 * Validates negative-path deletion attempts for refresh tokens in the
 * Discussion Board admin API. Ensures correct error responses and no side
 * effects.
 *
 * 1. Register an admin account using /auth/admin/join to establish
 *    authorization and obtain bearer tokens for subsequent requests.
 * 2. Generate a random UUID for a refreshTokenId that does not exist (avoiding
 *    collision with any actual session/token in DB).
 * 3. As an authenticated admin, attempt DELETE
 *    /discussionBoard/admin/refreshTokens/{refreshTokenId} with the
 *    non-existent ID and expect a not-found (HTTP 404) error.
 * 4. Clear the connection's Authorization header (simulate an unauthorized or
 *    logged-out request). Attempt the same DELETE request—expect a
 *    forbidden (HTTP 403) error.
 * 5. Repeat both requests to confirm idempotency and consistent error status.
 *    No tokens should be deleted on repeated attempts.
 * 6. Throughout, use TestValidator.httpError with traceable titles to confirm
 *    error enforcement. No state-altering calls for actual tokens should be
 *    made.
 */
export async function test_api_admin_refresh_token_soft_delete_not_found_or_forbidden(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an access token
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    },
  });
  typia.assert(adminJoin);

  // 2. Generate a UUID for a refresh token that does not exist
  const nonExistentTokenId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt DELETE as admin on non-existent refresh token (expect NOT FOUND)
  await TestValidator.httpError(
    "DELETE non-existent refresh token as admin must return 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.refreshTokens.erase(
        connection,
        {
          refreshTokenId: nonExistentTokenId,
        },
      );
    },
  );

  // 4. Remove Authorization to simulate forbidden/unauthenticated (NEVER set Authorization directly)
  const unauthConn: api.IConnection = {
    ...connection,
    headers: { ...(connection.headers ?? {}) },
  };
  if (unauthConn.headers?.Authorization)
    delete unauthConn.headers.Authorization;

  // 5. Attempt DELETE as unauthenticated user (expect FORBIDDEN)
  await TestValidator.httpError(
    "DELETE refresh token as unauthorized user must return 403",
    403,
    async () => {
      await api.functional.discussionBoard.admin.refreshTokens.erase(
        unauthConn,
        {
          refreshTokenId: nonExistentTokenId,
        },
      );
    },
  );

  // 6. Repeat DELETE attempts for idempotency: errors are still correct
  await TestValidator.httpError(
    "DELETE non-existent refresh token as admin (repeated) must return 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.refreshTokens.erase(
        connection,
        {
          refreshTokenId: nonExistentTokenId,
        },
      );
    },
  );

  await TestValidator.httpError(
    "DELETE non-existent refresh token as unauthorized user (repeated) must return 403",
    403,
    async () => {
      await api.functional.discussionBoard.admin.refreshTokens.erase(
        unauthConn,
        {
          refreshTokenId: nonExistentTokenId,
        },
      );
    },
  );
}
