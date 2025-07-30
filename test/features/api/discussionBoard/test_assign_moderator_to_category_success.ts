import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardCategoryModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategoryModerator";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test assigning a valid moderator to a category as an admin.
 *
 * This test covers the positive scenario of assigning a moderator to a
 * discussion board category via the admin API. It verifies that a valid admin
 * can successfully assign a new moderator to an existing category, ensuring:
 *
 * - The admin, category, and moderator all exist prior to assignment
 *   (prerequisite API calls).
 * - The assignment is new (i.e., no existing assignment for this moderator and
 *   category).
 * - The response contains accurate references to the assigned category and
 *   moderator, and includes audit metadata such as id and timestamps.
 *
 * Steps:
 *
 * 1. Create an admin (who will perform the assignment).
 * 2. Create a category to target for moderation.
 * 3. Create a moderator (to be assigned).
 * 4. Assign the moderator to the category as an admin using the target endpoint.
 * 5. Validate the assignment object, checking that ids and references are correct
 *    and that audit fields (id, created_at) are present and correct.
 */
export async function test_api_discussionBoard_test_assign_moderator_to_category_success(
  connection: api.IConnection,
) {
  // 1. Create an admin
  const adminUserId: string = RandomGenerator.alphaNumeric(16);
  const admin: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.admins.create(connection, {
      body: {
        user_identifier: adminUserId,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(admin);

  // 2. Create a category
  const categoryName: string = RandomGenerator.alphaNumeric(12);
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: categoryName,
        is_active: true,
        description: "Test category for moderator assignment",
        parent_id: null,
      },
    });
  typia.assert(category);

  // 3. Create a moderator
  const moderatorUserId: string = RandomGenerator.alphaNumeric(16);
  const moderator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderatorUserId,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(moderator);

  // 4. Assign moderator to category as admin
  const assignment: IDiscussionBoardCategoryModerator =
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

  // 5. Validate references and audit fields
  TestValidator.equals("assigned category id matches")(assignment.category_id)(
    category.id,
  );
  TestValidator.equals("assigned moderator id matches")(
    assignment.moderator_id,
  )(moderator.id);
  TestValidator.predicate("assignment id is a UUID")(
    /^[0-9a-fA-F-]{36}$/.test(assignment.id),
  );
  TestValidator.predicate("assignment creation timestamp is valid ISO8601")(
    typeof assignment.created_at === "string" &&
      !isNaN(Date.parse(assignment.created_at)),
  );
}
