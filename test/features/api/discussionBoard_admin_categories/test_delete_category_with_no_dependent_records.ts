import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test successful deletion of a discussion board category by an admin when
 * there are no dependent records.
 *
 * This test verifies that an admin can create and then permanently delete a
 * discussion board category when no dependent entities (such as topics or
 * moderator assignments) exist referencing that category. It checks that the
 * operation completes successfully, and (if the API allowed) would check that
 * the deleted category is no longer present in the system.
 *
 * Steps:
 *
 * 1. Create a new admin user (simulating an admin assignment scenario).
 * 2. As admin, create a new discussion board category (fresh, no dependencies).
 * 3. Delete the category that was just created.
 * 4. (If available: attempt retrieving or listing to confirm the category was
 *    removed. Skipped if no such endpoint exists.)
 */
export async function test_api_discussionBoard_admin_categories_test_delete_category_with_no_dependent_records(
  connection: api.IConnection,
) {
  // 1. Create a new admin user who will perform further operations
  const adminUserIdentifier: string = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: adminUserIdentifier,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    },
  );
  typia.assert(admin);

  // 2. Create a new discussion board category as the admin
  const categoryName = `test_category_${RandomGenerator.alphaNumeric(10)}`;
  const newCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: categoryName,
        is_active: true,
        description: "Automated test category",
        parent_id: null,
      },
    });
  typia.assert(newCategory);
  TestValidator.equals("category name matches")(newCategory.name)(categoryName);

  // 3. Delete the created category
  await api.functional.discussionBoard.admin.categories.erase(connection, {
    categoryId: newCategory.id,
  });

  // 4. (If listing/retrieval API existed, would assert nonexistence here.)
}
