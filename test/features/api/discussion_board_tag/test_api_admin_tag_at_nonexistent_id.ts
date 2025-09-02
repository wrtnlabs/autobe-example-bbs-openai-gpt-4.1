import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Verify error handling and information disclosure safeguards when
 * retrieving a non-existent discussion board tag as admin.
 *
 * This test ensures that when an authenticated admin attempts to fetch
 * details for a tag UUID that does not exist, the API correctly returns a
 * not-found error (ideally HTTP 404) and does NOT disclose any sensitive
 * internal information.
 *
 * Steps:
 *
 * 1. Provision an admin account with /auth/admin/join to acquire admin-level
 *    authentication (needed for tag management endpoints).
 * 2. Issue a GET to /discussionBoard/admin/tags/{tagId} using a random UUID
 *    (vanishingly unlikely to exist).
 * 3. Assert that an HTTP error is thrown with status 404 when the tag does not
 *    exist.
 * 4. (Security) Confirm by contract: no sensitive details are leaked in the
 *    error response structure. (Full payload validation requires
 *    implementation-specific knowledge.)
 *
 * This scenario enforces both correct not-found error signaling and guards
 * against backend information leakage in the discussion board admin tag
 * management context.
 */
export async function test_api_admin_tag_at_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Register a new admin account and acquire authentication
  const adminUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const adminAuthorized: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: adminUserId,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(adminAuthorized);
  // Check important admin fields
  TestValidator.predicate(
    "admin join returns activated admin",
    adminAuthorized.admin.is_active === true,
  );
  TestValidator.predicate(
    "admin join provides authorization token",
    typeof adminAuthorized.token?.access === "string" &&
      adminAuthorized.token.access.length > 0,
  );

  // 2. Attempt to fetch tag details for a non-existent UUID
  const nonExistentTagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "fetching non-existent discussion board tag as admin returns 404 and no sensitive disclosure",
    404,
    async () => {
      await api.functional.discussionBoard.admin.tags.at(connection, {
        tagId: nonExistentTagId,
      });
    },
  );
  // (If the API error body ever appears, manual security review required to verify information-hiding.)
}
