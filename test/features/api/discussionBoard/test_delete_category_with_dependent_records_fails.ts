import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate that a discussion board category cannot be hard-deleted if there are
 * dependent records (e.g., topic) referencing it.
 *
 * This test verifies the business rule that a category cannot be deleted if
 * topics exist that reference this category as a foreign key. Attempting to
 * delete should result in an error.
 *
 * Workflow:
 *
 * 1. Create an admin user (to perform all admin-level operations).
 * 2. Create a new discussion board category.
 * 3. Register a board member (required for topic creation).
 * 4. Create a topic in the new category (establishes the dependency).
 * 5. Attempt to delete the category.
 * 6. Assert that the deletion fails with an error due to the dependency.
 */
export async function test_api_discussionBoard_test_delete_category_with_dependent_records_fails(
  connection: api.IConnection,
) {
  // 1. Create an admin user for permissioned actions
  const adminUserIdentifier = RandomGenerator.alphabets(7) + "_admin";
  const admin: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.admins.create(connection, {
      body: {
        user_identifier: adminUserIdentifier,
        granted_at: new Date().toISOString(),
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new category for the test
  const categoryName = RandomGenerator.alphabets(8) + " Category";
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: categoryName,
        description: "For dependency deletion test.",
        parent_id: null,
        is_active: true,
      } satisfies IDiscussionBoardCategory.ICreate,
    });
  typia.assert(category);

  // 3. Register a board member for topic creation
  const memberIdentifier = RandomGenerator.alphabets(8) + "_mbr";
  const member: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: memberIdentifier,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 4. Create a topic within the category, ensuring a dependency
  const topic: IDiscussionBoardTopics =
    await api.functional.discussionBoard.admin.topics.create(connection, {
      body: {
        title: RandomGenerator.alphabets(10) + " Topic",
        description: "Dependency topic for deletion test.",
        pinned: false,
        closed: false,
        discussion_board_category_id: category.id,
      } satisfies IDiscussionBoardTopics.ICreate,
    });
  typia.assert(topic);

  // 5. Attempt to delete the category (should fail due to dependency)
  await TestValidator.error(
    "Deleting a category with dependent topics must fail",
  )(async () => {
    await api.functional.discussionBoard.admin.categories.erase(connection, {
      categoryId: category.id,
    });
  });
}
