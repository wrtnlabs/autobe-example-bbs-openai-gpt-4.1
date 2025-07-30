import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate disallowing duplicate topic titles within the same category in the
 * discussion board.
 *
 * This test ensures that the system prevents creating two topics with the same
 * title in the same category. It first obtains a valid active category, then
 * creates a topic in that category with a randomly generated title. It next
 * tries to create another topic in the same category using the exact same
 * title. The API should reject the second creation with a conflict/validation
 * error due to the unique title constraint within a category.
 *
 * Workflow:
 *
 * 1. Retrieve a list of active discussion board categories.
 * 2. Select an active category for topic creation.
 * 3. Generate random content for the topic, including a random title.
 * 4. Create the first topic in the selected category with the random title.
 * 5. Attempt to create a second topic in the same category with the same title.
 * 6. Confirm the API rejects the duplicate title creation via error assertion.
 */
export async function test_api_discussionBoard_test_create_topic_with_duplicate_title_in_category(
  connection: api.IConnection,
) {
  // 1. Retrieve list of discussion board categories
  const categoryPage =
    await api.functional.discussionBoard.categories.index(connection);
  typia.assert(categoryPage);

  // 2. Select an active category
  const activeCategories = categoryPage.data.filter((cat) => cat.is_active);
  if (activeCategories.length === 0)
    throw new Error("No active discussion board categories.");
  const category = RandomGenerator.pick(activeCategories);

  // 3. Generate random topic details
  const randomTitle = RandomGenerator.paragraph()(1); // Short random phrase to simulate a title
  const topicBody: IDiscussionBoardTopics.ICreate = {
    title: randomTitle,
    description: RandomGenerator.paragraph()(),
    pinned: false,
    closed: false,
    discussion_board_category_id: category.id,
  };

  // 4. Create the first topic with this title
  const topic1 = await api.functional.discussionBoard.member.topics.create(
    connection,
    { body: topicBody },
  );
  typia.assert(topic1);
  TestValidator.equals("created topic title matches")(topic1.title)(
    randomTitle,
  );
  TestValidator.equals("correct category")(topic1.discussion_board_category_id)(
    category.id,
  );

  // 5. Attempt to create a second topic with the same title in same category (should fail)
  await TestValidator.error("duplicate topic title in category should fail")(
    async () => {
      await api.functional.discussionBoard.member.topics.create(connection, {
        body: topicBody,
      });
    },
  );
}
