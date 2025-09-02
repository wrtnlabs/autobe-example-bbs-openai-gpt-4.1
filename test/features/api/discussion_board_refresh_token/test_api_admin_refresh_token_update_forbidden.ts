import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRefreshToken";

/**
 * Test permission enforcement on refresh token update endpoint.
 *
 * This test ensures that non-admin and unauthenticated users cannot update
 * a refresh token via the admin endpoint. It establishes an admin account
 * using the required dependency, then performs update attempts:
 *
 * 1. Register an admin using the /auth/admin/join endpoint, acquiring a valid
 *    admin context.
 * 2. Logout (remove Authorization header) to simulate an unauthenticated user
 *    and attempt to update a refresh token with random ID and update data.
 *    Assert that access is forbidden.
 * 3. (If possible) Simulate a standard/non-admin user session and attempt the
 *    update, also expecting forbidden.
 *
 * The test validates that neither unauthenticated nor non-admin users can
 * access admin-only operations, enforcing strict role-based access
 * control.
 */
export async function test_api_admin_refresh_token_update_forbidden(
  connection: api.IConnection,
) {
  // 1. Register an admin (setup requirement, but token is intentionally not used for forbidden scenarios)
  const adminCreateInput = typia.random<IDiscussionBoardAdmin.ICreate>();
  const adminResult = await api.functional.auth.admin.join(connection, {
    body: adminCreateInput,
  });
  typia.assert(adminResult);

  // 2. Test Update as UNAUTHENTICATED (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated users cannot update admin refresh token",
    async () => {
      await api.functional.discussionBoard.admin.refreshTokens.update(
        unauthConn,
        {
          refreshTokenId: typia.random<string & tags.Format<"uuid">>(),
          body: typia.random<IDiscussionBoardRefreshToken.IUpdate>(),
        },
      );
    },
  );

  // 3. (Optional): Simulate non-admin (standard) user and attempt forbidden update
  //    Not implemented since there is no API/DTO for non-admin user session.
}
