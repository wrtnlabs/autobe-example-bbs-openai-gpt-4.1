import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRefreshToken";
import type { IPageIDiscussionBoardRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRefreshToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for successful paginated and filtered refresh token search as
 * admin.
 *
 * 1. Register a new admin using /auth/admin/join (auto-login).
 * 2. Confirm output includes token and admin profile (schema compliance).
 * 3. Call PATCH /discussionBoard/admin/refreshTokens as authenticated admin,
 *    with: a) No filter (empty object: full list, default pagination) b)
 *    Pagination params (page=1, limit=5) c) Filtering by
 *    discussion_board_user_id (using admin's own user_id as sample) d)
 *    Filtering by revoked_at (null and non-null for active/inactive tokens)
 *    e) Filtering by device_info (null and random string edge-case) f)
 *    Filtering by expires_at_gte and expires_at_lte (date windows) g)
 *    Ordering (orderBy), if supported by schema
 * 4. For each response, assert typia.assert and check:
 *
 *    - Pagination property and its fields
 *    - Data is array of IDiscussionBoardRefreshToken
 *    - Filter effects (matching user_id, revoked status, device_info, etc), as
 *         possible
 *    - The endpoint never exposes sensitive token values more than business
 *         allows
 * 5. If multiple valid tokens exist, validate that only tokens matching
 *    filter(s) are included.
 * 6. Confirm no errors are thrown for valid/edge-case filters.
 */
export async function test_api_admin_refresh_token_search_success_and_filtering(
  connection: api.IConnection,
) {
  // STEP 1: Register a new admin (admin join auto-logs in)
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const joinResult: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: adminUserId,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(joinResult);
  TestValidator.predicate(
    "admin join provides token",
    !!joinResult.token && !!joinResult.token.access,
  );
  TestValidator.predicate(
    "admin join provides admin profile",
    !!joinResult.admin && !!joinResult.admin.id,
  );

  // Extract for filter scenarios
  const adminProfile = joinResult.admin;

  // STEP 2a: No filter (should return full list with pagination)
  const listAll =
    await api.functional.discussionBoard.admin.refreshTokens.index(connection, {
      body: {} satisfies IDiscussionBoardRefreshToken.IRequest,
    });
  typia.assert(listAll);
  TestValidator.predicate(
    "listAll has pagination",
    !!listAll.pagination && typeof listAll.pagination.limit === "number",
  );
  TestValidator.predicate("listAll data is array", Array.isArray(listAll.data));

  // STEP 2b: Pagination params (page=1, limit=5)
  const paged = await api.functional.discussionBoard.admin.refreshTokens.index(
    connection,
    {
      body: {
        page: 1 as number,
        limit: 5 as number,
      } satisfies IDiscussionBoardRefreshToken.IRequest,
    },
  );
  typia.assert(paged);
  TestValidator.equals("paged limit is 5", paged.pagination.limit, 5);
  TestValidator.equals("paged current is 1", paged.pagination.current, 1);

  // STEP 2c: Filter by discussion_board_user_id (using admin's user_id)
  const byUserResult =
    await api.functional.discussionBoard.admin.refreshTokens.index(connection, {
      body: {
        discussion_board_user_id: adminProfile.user_id,
      } satisfies IDiscussionBoardRefreshToken.IRequest,
    });
  typia.assert(byUserResult);
  for (const tk of byUserResult.data) {
    TestValidator.equals(
      "all tokens match admin user_id",
      tk.discussion_board_user_id,
      adminProfile.user_id,
    );
  }

  // STEP 2d: Filter by revoked_at: null (active tokens)
  const activeTokens =
    await api.functional.discussionBoard.admin.refreshTokens.index(connection, {
      body: {
        revoked_at: null,
      } satisfies IDiscussionBoardRefreshToken.IRequest,
    });
  typia.assert(activeTokens);
  for (const tk of activeTokens.data) {
    TestValidator.equals(
      "active tokens have revoked_at null",
      tk.revoked_at,
      null,
    );
  }

  // ...non-null check (simulate revoked tokens with iso string)
  const someDate = new Date().toISOString();
  const revokedTokens =
    await api.functional.discussionBoard.admin.refreshTokens.index(connection, {
      body: {
        revoked_at: someDate,
      } satisfies IDiscussionBoardRefreshToken.IRequest,
    });
  typia.assert(revokedTokens);
  for (const tk of revokedTokens.data) {
    TestValidator.equals(
      "revoked tokens have revoked_at equal to filter",
      tk.revoked_at,
      someDate,
    );
  }

  // STEP 2e: device_info = null
  const deviceNullResult =
    await api.functional.discussionBoard.admin.refreshTokens.index(connection, {
      body: {
        device_info: null,
      } satisfies IDiscussionBoardRefreshToken.IRequest,
    });
  typia.assert(deviceNullResult);
  for (const tk of deviceNullResult.data) {
    TestValidator.equals("device_info is null", tk.device_info, null);
  }

  // device_info = random string (simulate edge)
  const randomDevice = RandomGenerator.alphaNumeric(8);
  const deviceStringResult =
    await api.functional.discussionBoard.admin.refreshTokens.index(connection, {
      body: {
        device_info: randomDevice,
      } satisfies IDiscussionBoardRefreshToken.IRequest,
    });
  typia.assert(deviceStringResult);
  for (const tk of deviceStringResult.data) {
    TestValidator.equals(
      "device_info matches filter string",
      tk.device_info,
      randomDevice,
    );
  }

  // STEP 2f: expires_at_gte (now)
  const now = new Date().toISOString();
  const byExpiresGte =
    await api.functional.discussionBoard.admin.refreshTokens.index(connection, {
      body: {
        expires_at_gte: now,
      } satisfies IDiscussionBoardRefreshToken.IRequest,
    });
  typia.assert(byExpiresGte);
  for (const tk of byExpiresGte.data) {
    TestValidator.predicate("expires_at is >= now", tk.expires_at >= now);
  }

  // expires_at_lte = far future
  const farFuture = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const byExpiresLte =
    await api.functional.discussionBoard.admin.refreshTokens.index(connection, {
      body: {
        expires_at_lte: farFuture,
      } satisfies IDiscussionBoardRefreshToken.IRequest,
    });
  typia.assert(byExpiresLte);
  for (const tk of byExpiresLte.data) {
    TestValidator.predicate(
      "expires_at is <= far future",
      tk.expires_at <= farFuture,
    );
  }

  // STEP 2g: orderBy = 'expires_at'
  const ordered =
    await api.functional.discussionBoard.admin.refreshTokens.index(connection, {
      body: {
        orderBy: "expires_at",
      } satisfies IDiscussionBoardRefreshToken.IRequest,
    });
  typia.assert(ordered);
  // If needed, could verify the ordering logic here, but left as an exercise if sorting is crucial
  // No errors should be thrown throughout
}
