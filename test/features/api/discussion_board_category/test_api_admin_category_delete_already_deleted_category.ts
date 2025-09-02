import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test repeated deletion of a soft-deleted discussion board category by
 * admin.
 *
 * This test ensures the API enforces business rules that prevent deleting
 * an already soft-deleted category. The steps are:
 *
 * 1. Register and authenticate an admin using /auth/admin/join (required for
 *    admin API calls).
 * 2. Create a new discussion board category using
 *    /discussionBoard/admin/categories (returns a valid categoryId).
 * 3. Soft-delete the category (sets deleted_at with
 *    /discussionBoard/admin/categories/{categoryId}).
 * 4. Attempt to soft-delete the same category again and check that an error is
 *    returned, confirming that already-deleted categories cannot be deleted
 *    again.
 */
export async function test_api_admin_category_delete_already_deleted_category(
  connection: api.IConnection,
) {
  // Step 1. Register/admin join
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuthorized);

  // Step 2. Create a category
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 10,
        }),
        description: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 4,
          wordMax: 12,
        }),
        is_active: true,
        sort_order: 1,
      } satisfies IDiscussionBoardCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3. First deletion attempt: soft-delete the category
  await api.functional.discussionBoard.admin.categories.erase(connection, {
    categoryId: category.id,
  });

  // Step 4. Second deletion attempt: expect error
  await TestValidator.error(
    "attempting to delete an already soft-deleted category returns error",
    async () => {
      await api.functional.discussionBoard.admin.categories.erase(connection, {
        categoryId: category.id,
      });
    },
  );
}
