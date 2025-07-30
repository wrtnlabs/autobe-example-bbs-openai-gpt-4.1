import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardCategoryModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategoryModerator";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate that updating a category-moderator assignment fails when an
 * invalid/non-existent moderatorId is supplied.
 *
 * Business context: Moderator assignments are managed by admins. Changing an
 * assignment to a non-existent moderator should strictly fail with an error (no
 * silent success or creation of orphaned FKs). This test ensures robust
 * validation and that no accidental assignment can be made to an invalid
 * moderator.
 *
 * Workflow steps:
 *
 * 1. Create a discussion board category (save categoryId)
 * 2. Create a valid moderator (save moderatorId)
 * 3. Assign that moderator to the category (save categoryModeratorId)
 * 4. Attempt to update the assignment (categoryModeratorId) with a random
 *    (non-existent) moderatorId
 * 5. Validate that the update API fails (throws error)
 * 6. (If possible) Re-fetch the assignment record and verify that moderatorId in
 *    the assignment remains unchanged
 */
export async function test_api_discussionBoard_admin_categories_categoryModerators_test_update_category_moderator_assignment_with_nonexistent_moderator_id_fails(
  connection: api.IConnection,
) {
  // 1. Create category
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphabets(12),
        is_active: true,
        description: "Test category for e2e validation",
        parent_id: null,
      },
    },
  );
  typia.assert(category);

  // 2. Create a real moderator
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(10),
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(moderator);

  // 3. Assign moderator to category
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

  // 4. Pick a random UUID that could never be a valid moderator
  let nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();
  // Guarantee it's actually different than the existing moderator.id
  while (nonExistentModeratorId === moderator.id) {
    nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();
  }

  // 5. Attempt update: Should fail
  await TestValidator.error("should fail for invalid moderator reference")(() =>
    api.functional.discussionBoard.admin.categories.categoryModerators.update(
      connection,
      {
        categoryId: category.id,
        categoryModeratorId: assignment.id,
        body: {
          moderator_id: nonExistentModeratorId,
        },
      },
    ),
  );

  // 6. Confirm the assignment was not changed (moderator_id is original one)
  // (Currently not possible with present SDK—no single assignment GET API)
}
