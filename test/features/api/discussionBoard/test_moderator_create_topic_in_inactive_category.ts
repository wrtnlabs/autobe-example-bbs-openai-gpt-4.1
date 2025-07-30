import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate that even a moderator cannot create a topic in an inactive category.
 *
 * This test ensures the business rule that prevents topic creation in inactive
 * categories applies to moderators too.
 *
 * Steps:
 *
 * 1. Retrieve all discussion board categories to find one that is inactive.
 * 2. Attempt to create a topic in that inactive category using the moderator
 *    endpoint.
 * 3. Confirm that the operation is rejected (throws an error).
 */
export async function test_api_discussionBoard_test_moderator_create_topic_in_inactive_category(
  connection: api.IConnection,
) {
  // 1. Retrieve all discussion board categories
  const categories =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(categories);

  // 2. Find an inactive category (is_active === false)
  const inactiveCategory = categories.data.find(
    (cat) => cat.is_active === false,
  );
  if (!inactiveCategory)
    throw new Error("No inactive category found - cannot test this scenario.");

  // 3. Attempt to create a topic as a moderator in the inactive category
  await TestValidator.error(
    "Moderator cannot create topic in inactive category",
  )(() =>
    api.functional.discussionBoard.moderator.topics.create(connection, {
      body: {
        title: `Test topic in inactive category (${inactiveCategory.name})`,
        description:
          "Attempting to create a topic in an inactive category. This should fail.",
        pinned: false,
        closed: false,
        discussion_board_category_id: inactiveCategory.id,
      },
    }),
  );
}
