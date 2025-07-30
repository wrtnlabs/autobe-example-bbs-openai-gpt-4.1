import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardCategoryModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategoryModerator";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate that retrieving a non-existent moderator assignment for a discussion
 * board category returns a not-found error.
 *
 * This test ensures the API properly handles erroneous lookups of category
 * moderator assignments. It confirms that when an administrator attempts to
 * retrieve a moderator assignment (via `categoryModeratorId`) that does not
 * actually exist for a valid category, the API responds appropriately with a
 * not-found error, rather than returning a record or an unexpected error code.
 *
 * Steps:
 *
 * 1. Create a discussion board admin (to represent authentication/authorization
 *    context).
 * 2. Use admin privileges to create a valid discussion board category.
 * 3. Attempt to retrieve a moderator assignment using the real category's id, but
 *    provide a completely random (non-existent) categoryModeratorId.
 * 4. Confirm that the API call results in a not-found error (i.e., raises an
 *    HttpError or fails appropriately), ensuring correct error semantics and
 *    API robustness for invalid IDs.
 */
export async function test_api_discussionBoard_test_retrieve_single_nonexistent_moderator_assignment_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Create an admin (prerequisite for all admin endpoints)
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

  // 2. Create a valid discussion board category
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(8),
        is_active: true,
        description: RandomGenerator.paragraph()(),
        parent_id: null,
      },
    },
  );
  typia.assert(category);

  // 3. Attempt to retrieve a non-existent moderator assignment
  //    Use correct category id, but random UUID for categoryModeratorId
  const nonExistentCategoryModeratorId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "should fail not-found for non-existent assignment",
  )(() =>
    api.functional.discussionBoard.admin.categories.categoryModerators.at(
      connection,
      {
        categoryId: category.id,
        categoryModeratorId: nonExistentCategoryModeratorId,
      },
    ),
  );
}
