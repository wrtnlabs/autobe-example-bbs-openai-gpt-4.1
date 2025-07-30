import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate API rejects topic creation in inactive categories.
 *
 * Business rationale: By design, discussion board categories marked as inactive
 * (`is_active: false`) must not allow creation of new topics. This prevents
 * users from misusing or populating obsolete sections of the board.
 *
 * This test ensures that the API enforces this business rule, and any attempt
 * to create a topic in an inactive category is properly rejected at the
 * backend.
 *
 * Test steps:
 *
 * 1. Retrieve all discussion board categories.
 * 2. Find a category that is inactive (`is_active: false`).
 *
 *    - If no such category exists, log and skip this negative test.
 * 3. Attempt to create a topic using the inactive category's ID.
 * 4. Confirm that an error is thrown, validating that the API correctly blocks the
 *    action.
 *
 * Positive scenario: Not applicable. (Negative test case.) Negative scenario:
 * API must prevent topic creation in inactive category.
 */
export async function test_api_discussionBoard_test_create_topic_with_inactive_category(
  connection: api.IConnection,
) {
  // 1. Retrieve all categories (includes both active and inactive)
  const categories =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(categories);

  // 2. Find the first inactive category for negative test
  const inactive = categories.data.find(
    (category) => category.is_active === false,
  );
  if (!inactive) {
    // No inactive category to test with; skip further steps
    console.warn(
      "No inactive discussion board category available – skipping negative test.",
    );
    return;
  }

  // 3. Attempt to create a topic in the inactive category, expecting this to fail
  await TestValidator.error(
    "Should not allow topic creation in inactive category",
  )(() =>
    api.functional.discussionBoard.member.topics.create(connection, {
      body: {
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: inactive.id,
      } satisfies IDiscussionBoardTopics.ICreate,
    }),
  );
}
