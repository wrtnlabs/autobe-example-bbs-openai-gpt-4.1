import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate that topic creation as admin fails on inactive categories.
 *
 * Business context: Topic creation must be blocked on categories that are
 * inactive (is_active === false), even for admin users. This test ensures the
 * API rejects such attempts according to business rules.
 *
 * Test steps:
 *
 * 1. Fetch all discussion board categories.
 * 2. Identify a category where is_active === false.
 *
 *    - If none exist, the test fails by design.
 * 3. Attempt to create a topic as admin, using valid data, under the chosen
 *    inactive category.
 * 4. Confirm the API properly rejects the creation, causing the call to throw.
 */
export async function test_api_discussionBoard_test_admin_create_topic_in_inactive_category(
  connection: api.IConnection,
) {
  // 1. Fetch all discussion board categories
  const categoriesPage =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(categoriesPage);

  // 2. Select an inactive category to test with
  const inactiveCategory = categoriesPage.data.find((cat) => !cat.is_active);
  if (!inactiveCategory)
    throw new Error(
      "No inactive category found. Test cannot proceed without at least one inactive category.",
    );

  // 3 & 4. Attempt to create a topic as admin in the inactive category, expecting an error
  await TestValidator.error(
    "should not allow topic creation for inactive category",
  )(async () => {
    await api.functional.discussionBoard.admin.topics.create(connection, {
      body: {
        title: RandomGenerator.paragraph()(3),
        description: RandomGenerator.paragraph()(1),
        pinned: false,
        closed: false,
        discussion_board_category_id: inactiveCategory.id,
      } satisfies IDiscussionBoardTopics.ICreate,
    });
  });
}
