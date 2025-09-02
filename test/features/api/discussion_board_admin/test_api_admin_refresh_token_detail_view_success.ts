import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRefreshToken";

/**
 * Validates retrieval of a specific refresh token's detail by an
 * authenticated admin.
 *
 * Workflow:
 *
 * 1. Generate a valid admin user ID (UUID).
 * 2. Register the user as an admin through POST /auth/admin/join, receiving
 *    the admin credentials and session tokens.
 * 3. Use a simulated refresh token UUID to fetch refresh token detail as
 *    business API does not expose listing by user.
 * 4. Request refresh token details by UUID using GET
 *    /discussionBoard/admin/refreshTokens/{refreshTokenId}.
 * 5. Validate the response structure, presence/format of required metadata
 *    fields, and non-null status for intended metadata.
 * 6. Confirm sensitive field visibility (refresh_token string) is handled per
 *    business policy, noting that value presence is for internal test
 *    demonstration.
 *
 * This test does NOT assert linkage between the created admin session and
 * the refresh token record due to lack of a cross-listing API, but the
 * structure is correctly verified.
 */
export async function test_api_admin_refresh_token_detail_view_success(
  connection: api.IConnection,
) {
  // 1. Generate and assign a new admin user UUID
  const adminUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Register and authenticate as admin (join assigns admin rights to user_id)
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: { user_id: adminUserId } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin.user_id matches requested",
    adminAuth.admin.user_id,
    adminUserId,
  );

  // 3. (For demonstration) simulate obtaining a refresh token UUID for the test
  //    In full E2E, would look up refreshTokenId; here use random UUID
  const refreshTokenId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Access refresh token details as admin
  const tokenMeta: IDiscussionBoardRefreshToken =
    await api.functional.discussionBoard.admin.refreshTokens.at(connection, {
      refreshTokenId,
    });
  typia.assert(tokenMeta);
  TestValidator.equals(
    "Returned token id matches parameter",
    tokenMeta.id,
    refreshTokenId,
  );

  // 5. Validate required fields and ISO 8601 datetime formats
  TestValidator.predicate(
    "discussion_board_user_id should be non-empty UUID",
    typeof tokenMeta.discussion_board_user_id === "string" &&
      tokenMeta.discussion_board_user_id.length > 0,
  );
  TestValidator.predicate(
    "issued_at is valid ISO 8601 date",
    typeof tokenMeta.issued_at === "string" &&
      !isNaN(Date.parse(tokenMeta.issued_at)),
  );
  TestValidator.predicate(
    "expires_at is valid ISO 8601 date",
    typeof tokenMeta.expires_at === "string" &&
      !isNaN(Date.parse(tokenMeta.expires_at)),
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 date",
    typeof tokenMeta.created_at === "string" &&
      !isNaN(Date.parse(tokenMeta.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date",
    typeof tokenMeta.updated_at === "string" &&
      !isNaN(Date.parse(tokenMeta.updated_at)),
  );

  // 6. Additional optional field checks
  if (tokenMeta.revoked_at !== null && tokenMeta.revoked_at !== undefined)
    TestValidator.predicate(
      "revoked_at is null or valid ISO date",
      typeof tokenMeta.revoked_at === "string" &&
        !isNaN(Date.parse(tokenMeta.revoked_at)),
    );
  if (tokenMeta.deleted_at !== null && tokenMeta.deleted_at !== undefined)
    TestValidator.predicate(
      "deleted_at is null or valid ISO date",
      typeof tokenMeta.deleted_at === "string" &&
        !isNaN(Date.parse(tokenMeta.deleted_at)),
    );
  if (tokenMeta.device_info !== null && tokenMeta.device_info !== undefined)
    TestValidator.predicate(
      "device_info is string when present",
      typeof tokenMeta.device_info === "string",
    );

  // 7. Demonstrate that refresh_token field is structurally a string (as per DTO),
  //    but don't inspect the value, as security policy may prevent revealing its content.
  TestValidator.predicate(
    "refresh_token structurally present as string",
    typeof tokenMeta.refresh_token === "string",
  );
}
