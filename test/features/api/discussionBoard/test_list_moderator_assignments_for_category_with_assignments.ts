import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IPageIDiscussionBoardCategoryModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategoryModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategoryModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategoryModerator";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieval of the list of moderator assignments for a category with
 * assignments.
 *
 * Validates that after a moderator has been assigned to a newly created
 * category, the admin can fetch the list of moderator assignments for that
 * category, and the assignment data (ids, reference integrity, timestamps) is
 * correct and present.
 *
 * Steps:
 *
 * 1. Create an admin user (for role context)
 * 2. Create a new discussion board category
 * 3. Register a moderator
 * 4. Assign the moderator to the category
 * 5. Retrieve the list of moderator assignments for the category
 * 6. Verify the created assignment appears with correct metadata
 */
export async function test_api_discussionBoard_test_list_moderator_assignments_for_category_with_assignments(
  connection: api.IConnection,
) {
  // 1. Create an admin user
  const adminUserIdentifier = RandomGenerator.alphaNumeric(12);
  const grantDate = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: adminUserIdentifier,
        granted_at: grantDate,
      },
    },
  );
  typia.assert(admin);

  // 2. Create a new category
  const categoryName = `cat-${RandomGenerator.alphaNumeric(8)}`;
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: categoryName,
        is_active: true,
      },
    },
  );
  typia.assert(category);

  // 3. Register a moderator
  const moderatorUserIdentifier = RandomGenerator.alphaNumeric(12);
  const modGrantDate = new Date().toISOString();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderatorUserIdentifier,
        granted_at: modGrantDate,
      },
    });
  typia.assert(moderator);

  // 4. Assign the moderator to the category
  const assignment =
    await api.functional.discussionBoard.admin.categories.categoryModerators.create(
      connection,
      {
        categoryId: category.id,
        body: {
          category_id: category.id,
          moderator_id: moderator.id,
        },
      },
    );
  typia.assert(assignment);

  // 5. Retrieve moderator assignments for the category
  const assignmentsPage =
    await api.functional.discussionBoard.admin.categories.categoryModerators.index(
      connection,
      {
        categoryId: category.id,
      },
    );
  typia.assert(assignmentsPage);

  // 6. Validation: Check the assignment presence and correctness
  const found = assignmentsPage.data.find((a) => a.id === assignment.id);
  TestValidator.predicate("assignment presence")(!!found);
  if (!found)
    throw new Error(
      "Assigned moderator not found in category assignments list.",
    );
  TestValidator.equals("category id")(found.category_id)(category.id);
  TestValidator.equals("moderator id")(found.moderator_id)(moderator.id);
  TestValidator.predicate("created_at exists and is a string")(
    typeof found.created_at === "string" && found.created_at.length > 0,
  );
}
