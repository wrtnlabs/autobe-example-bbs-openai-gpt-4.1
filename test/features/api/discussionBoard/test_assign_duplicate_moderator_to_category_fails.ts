import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardCategoryModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategoryModerator";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate that assigning a moderator to a category twice fails with an error.
 *
 * This test ensures the API enforces the uniqueness of the moderator assignment
 * per category.
 *
 * 1. Create an admin (to satisfy admin authentication precondition).
 * 2. Create a category to assign a moderator to.
 * 3. Create a moderator account.
 * 4. Assign the moderator to the category (should succeed the first time).
 * 5. Attempt to assign the same moderator to the same category again (should fail
 *    due to uniqueness constraint).
 * 6. Confirm that the second attempt results in an error (e.g., HTTP 409 conflict
 *    or similar error is thrown).
 */
export async function test_api_discussionBoard_test_assign_duplicate_moderator_to_category_fails(
  connection: api.IConnection,
) {
  // 1. Create an admin user
  const adminUserIdentifier = RandomGenerator.alphaNumeric(10);
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: adminUserIdentifier,
        granted_at: new Date().toISOString(),
      } satisfies IDiscussionBoardAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Create a discussion category
  const categoryName = RandomGenerator.alphaNumeric(8);
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: categoryName,
        is_active: true,
      } satisfies IDiscussionBoardCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Create a moderator account
  const moderatorUserIdentifier = RandomGenerator.alphaNumeric(12);
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderatorUserIdentifier,
        granted_at: new Date().toISOString(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 4. Assign the moderator to the category (first time, should succeed)
  const assignment =
    await api.functional.discussionBoard.admin.categories.categoryModerators.create(
      connection,
      {
        categoryId: category.id,
        body: {
          category_id: category.id,
          moderator_id: moderator.id,
        } satisfies IDiscussionBoardCategoryModerator.ICreate,
      },
    );
  typia.assert(assignment);

  // 5. Attempt duplicate assignment (should fail)
  await TestValidator.error("Duplicate assignment should fail")(() =>
    api.functional.discussionBoard.admin.categories.categoryModerators.create(
      connection,
      {
        categoryId: category.id,
        body: {
          category_id: category.id,
          moderator_id: moderator.id,
        } satisfies IDiscussionBoardCategoryModerator.ICreate,
      },
    ),
  );
}
