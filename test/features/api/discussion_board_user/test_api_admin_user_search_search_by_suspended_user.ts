import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates searching for suspended users as an admin.
 *
 * This function ensures the PATCH /discussionBoard/admin/users endpoint
 * correctly filters for users who are suspended. It verifies through an
 * admin-authenticated search that only users with is_suspended=true are
 * returned. The test also checks for proper pagination, the presence of all
 * required user properties (for compliance/audit requirements), and ensures
 * that users without is_suspended=true do not appear in the result.
 *
 * Steps:
 *
 * 1. Authenticate as an admin (using /auth/admin/join)
 * 2. Call the user search endpoint with is_suspended=true in the request body
 * 3. Assert all returned user data has is_suspended:true
 * 4. Assert correct pagination fields are present and rational (current page,
 *    limit, total, etc.)
 * 5. Assert all relevant audit/user fields exist on each result (e.g., id,
 *    email, username, timestamps)
 * 6. Edge Case: If no suspended users exist, API should return empty data
 *    array without error and rational pagination metadata.
 * 7. (Optionally) Verify that the endpoint is only accessible to authenticated
 *    admins (access control).
 */
export async function test_api_admin_user_search_search_by_suspended_user(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: typia.random<IDiscussionBoardAdmin.ICreate>(),
  });
  typia.assert(adminAuth);

  // Step 2: Search users with is_suspended=true
  const response = await api.functional.discussionBoard.admin.users.index(
    connection,
    {
      body: {
        is_suspended: true,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(response);

  // Step 3: Validate all returned users are suspended
  for (const user of response.data) {
    typia.assert(user);
    TestValidator.equals("returned user is suspended", user.is_suspended, true);
    // Step 5: Assert audit/compliance fields exist and are correct
    TestValidator.predicate(
      "user.id is a valid uuid",
      typeof user.id === "string" && user.id.length > 0,
    );
    TestValidator.predicate(
      "user.email is a string",
      typeof user.email === "string" && user.email.length > 0,
    );
    TestValidator.predicate(
      "user.username is a string",
      typeof user.username === "string" && user.username.length > 0,
    );
    TestValidator.predicate(
      "user.created_at is defined",
      typeof user.created_at === "string" && user.created_at.length > 0,
    );
    TestValidator.predicate(
      "user.updated_at is defined",
      typeof user.updated_at === "string" && user.updated_at.length > 0,
    );
  }

  // Step 4: Check pagination metadata exists and is rational
  TestValidator.predicate(
    "pagination object exists",
    typeof response.pagination === "object",
  );
  TestValidator.predicate(
    "pagination current >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1 when records exist, else 1",
    response.pagination.records === 0
      ? response.pagination.pages === 1
      : response.pagination.pages >= 1,
  );

  // Step 6: If empty, API returns empty data without error
  TestValidator.equals(
    "empty data for no suspended users",
    Array.isArray(response.data) && response.data.length,
    response.pagination.records === 0 ? 0 : response.data.length,
  );
}
