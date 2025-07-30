import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate uniqueness enforcement for moderator topic creation in discussion
 * board categories.
 *
 * This test ensures that two topics with the same title cannot be created
 * within the same category by a moderator.
 *
 * Steps:
 *
 * 1. Fetch the list of all discussion board categories and select an active one.
 * 2. As a moderator, create a topic in that category with a distinct random title.
 * 3. Attempt to create a second topic in the same category using the same title.
 * 4. Confirm that the second creation attempt fails due to unique title constraint
 *    enforcement.
 */
export async function test_api_discussionBoard_test_moderator_create_topic_with_duplicate_title(
  connection: api.IConnection,
) {
  // 1. Fetch all discussion board categories and select an active category
  const categoriesPage =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(categoriesPage);
  const activeCategory = categoriesPage.data.find((cat) => cat.is_active);
  if (!activeCategory)
    throw new Error("No active category found for topic creation test.");

  // 2. Create the initial topic as a moderator with a random title
  const title = RandomGenerator.paragraph()(5); // 5-word random title
  const createBody = {
    title,
    description: RandomGenerator.content()()(),
    pinned: false,
    closed: false,
    discussion_board_category_id: activeCategory.id,
  } satisfies IDiscussionBoardTopics.ICreate;
  const topic = await api.functional.discussionBoard.moderator.topics.create(
    connection,
    { body: createBody },
  );
  typia.assert(topic);
  TestValidator.equals("created topic title matches request title")(
    topic.title,
  )(title);
  TestValidator.equals("created topic category matches request category")(
    topic.discussion_board_category_id,
  )(activeCategory.id);

  // 3. Attempt to create a duplicate-topic (same title/category) - should be rejected
  await TestValidator.error(
    "Duplicate topic title in same category is not allowed",
  )(async () => {
    await api.functional.discussionBoard.moderator.topics.create(connection, {
      body: createBody,
    });
  });
}
