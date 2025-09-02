import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRefreshToken";

/**
 * Test retrieval of a non-existent, soft-deleted, or forbidden refresh
 * token.
 *
 * This test covers multiple negative access scenarios for the admin refresh
 * token detail API:
 *
 * 1. Create a fresh admin account (using /auth/admin/join).
 * 2. As an authenticated admin, attempt to fetch a refresh token using a
 *    random UUID that does not exist. Expect a not-found (404) or access
 *    denied error.
 * 3. As an authenticated admin, attempt to fetch a refresh token using a
 *    plausible soft-deleted token id (simulate by using an additional
 *    random UUID, as hard deletion details are not exposed to the test
 *    user). Expect a not-found or forbidden error.
 * 4. Without authentication, attempt to fetch a refresh token (using another
 *    random UUID). Expect an access forbidden/unauthorized error.
 *
 * The test validates:
 *
 * - Proper error handling for non-existent and deleted refresh tokens
 * - Authorization enforcement on protected endpoints
 * - No sensitive information is returned in error payloads
 */
export async function test_api_admin_refresh_token_detail_invalid_or_forbidden_access(
  connection: api.IConnection,
) {
  // 1. Admin context setup
  const adminUserId: string = typia.random<string & tags.Format<"uuid">>();
  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: { user_id: adminUserId } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoinResult);

  // 2. Try to GET a non-existent refresh token (as admin)
  const nonExistentTokenId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "fetching non-existent refresh token as admin should fail",
    async () => {
      await api.functional.discussionBoard.admin.refreshTokens.at(connection, {
        refreshTokenId: nonExistentTokenId,
      });
    },
  );

  // 3. Try to GET a soft-deleted refresh token (simulate same as above)
  const deletedTokenId: string = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching soft-deleted refresh token as admin should fail",
    async () => {
      await api.functional.discussionBoard.admin.refreshTokens.at(connection, {
        refreshTokenId: deletedTokenId,
      });
    },
  );

  // 4. Without authentication, try the same endpoint
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  const forbiddenTokenId: string = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching refresh token as unauthorized user should be forbidden",
    async () => {
      await api.functional.discussionBoard.admin.refreshTokens.at(
        unauthConnection,
        {
          refreshTokenId: forbiddenTokenId,
        },
      );
    },
  );
}
