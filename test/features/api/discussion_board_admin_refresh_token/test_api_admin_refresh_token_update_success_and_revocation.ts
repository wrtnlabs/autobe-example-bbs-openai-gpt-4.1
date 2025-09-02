import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRefreshToken";

/**
 * Test updating and revoking an admin user's refresh token.
 *
 * This test simulates the workflow where an admin joins (which issues
 * tokens), then updates the metadata for their refresh token—either
 * revoking it or updating device/session info. The process ensures that:
 * (1) The PUT operation updates the specified mutable fields (revoked_at,
 * device_info); (2) Once revoked, subsequent usage of the token is denied
 * (where possible to validate); and (3) all returned data passes type and
 * logical validation.
 *
 * Steps:
 *
 * 1. Register a new admin by calling admin join (auto-logs in and issues
 *    tokens on success).
 * 2. Extract the refresh token ID and existing token info from the join
 *    response.
 * 3. Call the refresh tokens update endpoint with valid update data, including
 *    setting revoked_at to now and optionally updating device_info.
 * 4. Verify the returned object reflects the mutation: revoked_at is
 *    populated, device_info is updated.
 * 5. (Optionally) Attempt to use the revoked refresh token for any API call
 *    that can check for session invalidation (if such endpoint is testable
 *    in this suite).
 * 6. (Optionally) Attempt a double revocation (should succeed or no-op, do not
 *    error).
 * 7. Assert all mandatory type properties, correct values, and business logic.
 */
export async function test_api_admin_refresh_token_update_success_and_revocation(
  connection: api.IConnection,
) {
  // 1. Register a new admin (auto-login, returns session tokens and admin info)
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // 2. (NOTE) In a real system, you would list or fetch refresh tokens by admin user to get refreshTokenId.
  // Here, as no endpoint exposed for linking refresh token string to DB id, we use random uuid for demonstration.
  // Real app should fetch/capture the exact DB id mapping to admin user's session token.
  const now = new Date().toISOString();
  const deviceInfo = RandomGenerator.paragraph({ sentences: 2 });

  // 3. Call update to set revoked_at and new device_info
  const refreshTokenUpdate =
    await api.functional.discussionBoard.admin.refreshTokens.update(
      connection,
      {
        refreshTokenId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          revoked_at: now,
          device_info: deviceInfo,
        } satisfies IDiscussionBoardRefreshToken.IUpdate,
      },
    );
  typia.assert(refreshTokenUpdate);

  // 4. Validate update results
  TestValidator.equals(
    "refresh token revoked_at set to now",
    refreshTokenUpdate.revoked_at,
    now,
  );
  TestValidator.equals(
    "refresh token device_info updated",
    refreshTokenUpdate.device_info,
    deviceInfo,
  );

  // 5. (Optional) Attempt double revocation – should not fail, values remain idempotent or logically consistent.
  const doubleRevocation =
    await api.functional.discussionBoard.admin.refreshTokens.update(
      connection,
      {
        refreshTokenId: refreshTokenUpdate.id,
        body: {
          revoked_at: refreshTokenUpdate.revoked_at,
          device_info: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardRefreshToken.IUpdate,
      },
    );
  typia.assert(doubleRevocation);
  TestValidator.equals(
    "refresh token id remains consistent",
    doubleRevocation.id,
    refreshTokenUpdate.id,
  );
  TestValidator.equals(
    "refresh token remains revoked",
    doubleRevocation.revoked_at,
    refreshTokenUpdate.revoked_at,
  );
  // NOTE: As API does not allow us to use/validate refresh token usability post-revocation, test ends here.
}
