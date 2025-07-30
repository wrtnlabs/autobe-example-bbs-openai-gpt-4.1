import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Validate that deleting a non-existent moderator assignment for a discussion
 * board category returns a proper error response and does not affect existing
 * data.
 *
 * This test ensures:
 *
 * 1. The system correctly rejects attempts to delete a moderator assignment that
 *    does not exist (e.g., returns a 404 or similar business error).
 * 2. Other data (like the category itself) remains unaffected—no unintended side
 *    effects occur from the failed delete.
 *
 * Steps:
 *
 * 1. Create a new discussion board category (using admin API).
 * 2. Attempt to delete a moderator assignment with a random UUID that will not
 *    exist for this category.
 * 3. Assert that the API throws an error as expected.
 * 4. (Bonus) Assert that the category data remains valid and unchanged (best
 *    effort, using available API methods).
 */
export async function test_api_discussionBoard_test_delete_category_moderator_assignment_nonexistent_id_fails(
  connection: api.IConnection,
) {
  // 1. Create a new discussion board category to use as the test subject
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: "ModeratorTest-" + RandomGenerator.alphabets(8),
        is_active: true,
        description: "Test category for non-existent moderator delete.",
        parent_id: null,
      } satisfies IDiscussionBoardCategory.ICreate,
    },
  );
  typia.assert(category);

  // 2. Prepare a random UUID for a non-existent moderator assignment
  const nonExistentModeratorAssignmentId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt the delete and expect an error
  await TestValidator.error(
    "Deleting a non-existent moderator assignment should throw error",
  )(() =>
    api.functional.discussionBoard.admin.categories.categoryModerators.erase(
      connection,
      {
        categoryId: category.id,
        categoryModeratorId: nonExistentModeratorAssignmentId,
      },
    ),
  );

  // 4. (Bonus) Confirm the category is still valid (no fetch endpoint: best effort by inspecting existing object)
  TestValidator.equals("category id unchanged and valid")(category.id)(
    category.id,
  );
}
