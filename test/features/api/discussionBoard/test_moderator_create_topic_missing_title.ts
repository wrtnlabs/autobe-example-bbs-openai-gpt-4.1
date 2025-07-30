import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate backend input validation for moderator topic creation without
 * required title field.
 *
 * Business context: Moderators must supply a title when creating a new
 * discussion board topic. If the title is omitted, the backend should reject
 * the request and return a validation error.
 *
 * Steps performed:
 *
 * 1. Load available discussion board categories to obtain a valid category context
 *    for topic creation.
 * 2. Attempt to create a topic as a moderator but omit the required `title` field,
 *    deliberately constructing invalid input.
 * 3. Assert the API call fails with a validation error using TestValidator.error
 *    (error content is not inspected per requirements).
 */
export async function test_api_discussionBoard_test_moderator_create_topic_missing_title(
  connection: api.IConnection,
) {
  // 1. Load categories and select a valid one for context
  const categoriesPage =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(categoriesPage);
  TestValidator.predicate("Should have categories available")(
    categoriesPage.data.length > 0,
  );
  const category = categoriesPage.data[0];
  typia.assert(category);

  // 2. Construct request body without required `title` (invalid input)
  // Casting to any as omitting required fields is not generally permitted in TypeScript
  const invalidBody = {
    // title is intentionally omitted
    pinned: false,
    closed: false,
    discussion_board_category_id: category.id,
    // description is optional and omitted
  } as any;

  // 3. Attempt to create topic and expect failure
  await TestValidator.error("Creation must fail when title is missing")(
    async () => {
      await api.functional.discussionBoard.moderator.topics.create(connection, {
        body: invalidBody,
      });
    },
  );
}
