import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Validate that unauthorized users (non-admins) cannot create discussion board
 * categories via the admin endpoint.
 *
 * This test ensures the system's authorization logic properly rejects category
 * creation requests from users who do not possess the 'admin' role (e.g.,
 * standard members or unauthenticated guests).
 *
 * Steps:
 *
 * 1. Prepare valid category creation data using IDiscussionBoardCategory.ICreate.
 * 2. Attempt to invoke the admin-only category creation API as a non-admin user or
 *    public (unauthenticated) context.
 * 3. Confirm that a permission-denied error is thrown and that category creation
 *    fails as expected.
 */
export async function test_api_discussionBoard_test_fail_to_create_category_when_unauthorized(
  connection: api.IConnection,
) {
  // 1. Prepare valid category creation data
  const categoryInput: IDiscussionBoardCategory.ICreate = {
    name: `Unauthorized Test Category ${Date.now()}`,
    is_active: false,
    description: "This should NOT be created.",
    parent_id: null,
  };

  // 2. Attempt to create category as a non-admin (public connection: no admin privileges)
  await TestValidator.error("non-admins cannot create categories")(async () => {
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: categoryInput,
    });
  });
}
