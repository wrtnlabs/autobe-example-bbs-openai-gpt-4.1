import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardCategoryModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategoryModerator";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate the successful deletion of a discussion board category moderator
 * assignment by admin.
 *
 * This test verifies the end-to-end admin workflow:
 *
 * 1. Create a discussion board category.
 * 2. Create a moderator record.
 * 3. Assign the moderator to the category (capture categoryModeratorId).
 * 4. Remove the moderator assignment using the DELETE endpoint.
 * 5. Attempt a double delete to confirm hard removal (should error on second
 *    attempt).
 *
 * Due to the lack of assignment listing APIs and audit log interfaces, direct
 * permission and audit validation is not performed here.
 *
 * Full type validation, proper SDK usage, and workflow sequencing are enforced.
 */
export async function test_api_discussionBoard_test_delete_category_moderator_assignment_successfully(
  connection: api.IConnection,
) {
  // 1. Create a discussion board category
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(12),
        is_active: true,
        description: RandomGenerator.paragraph()(),
        parent_id: null,
      } satisfies IDiscussionBoardCategory.ICreate,
    },
  );
  typia.assert(category);

  // 2. Create a moderator record
  const userIdentifier = RandomGenerator.alphaNumeric(15);
  const grantedAt = new Date().toISOString();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: userIdentifier,
        granted_at: grantedAt,
        revoked_at: null,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 3. Assign the moderator to the category
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

  // 4. Remove the moderator assignment
  await api.functional.discussionBoard.admin.categories.categoryModerators.erase(
    connection,
    {
      categoryId: category.id,
      categoryModeratorId: assignment.id,
    },
  );

  // 5. Confirm delete is enforced (double delete should error)
  await TestValidator.error("Assignment cannot be deleted twice")(() =>
    api.functional.discussionBoard.admin.categories.categoryModerators.erase(
      connection,
      {
        categoryId: category.id,
        categoryModeratorId: assignment.id,
      },
    ),
  );
}
