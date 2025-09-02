import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test soft deletion (deactivation) of a refresh token as an admin.
 *
 * 1. Register and authenticate as a new admin using /auth/admin/join,
 *    receiving the admin profile and tokens (including refresh token).
 * 2. Use the acquired refresh token's identifier as the deletion target
 *    (simulate a scenario where an admin wants to invalidate their own
 *    session).
 * 3. As authenticated admin, call DELETE
 *    /discussionBoard/admin/refreshTokens/{refreshTokenId} using the known
 *    refresh token id.
 * 4. (If a response body existed) Validate a soft delete by confirming the
 *    relevant database record has deleted_at set, NOT physically removed.
 *    In real world, would confirm via audit log or token fetch/listing.
 * 5. (LIMITED TO SDK SCOPE) Since there is no returned token object or API to
 *    fetch token list or audit log, the test asserts void success response
 *    and relies on absence of errors as indicator of successful soft
 *    deletion in the system. If future APIs permit token
 *    visibility/listing, would validate actual deleted_at timestamp set or
 *    token omission from active lists.
 */
export async function test_api_admin_refresh_token_soft_delete_success(
  connection: api.IConnection,
) {
  // Step 1: Register and login as admin
  const userId = typia.random<string & tags.Format<"uuid">>();
  const adminJoinResult: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: userId,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminJoinResult);

  // Step 2: Extract refresh token from login response
  const refreshTokenId = adminJoinResult.token.refresh;
  TestValidator.predicate(
    "admin refresh token string exists",
    typeof refreshTokenId === "string" && refreshTokenId.length > 0,
  );

  // Step 3: As admin, soft delete the refresh token
  await api.functional.discussionBoard.admin.refreshTokens.erase(connection, {
    refreshTokenId: refreshTokenId as string & tags.Format<"uuid">,
  });

  // Step 4/5: (Limited by available APIs)
  // Since there are no token-list or fetch APIs, "success" is absence of error and no response body (void).
  // In production: would assert deleted_at on token and omission from active list.
}
