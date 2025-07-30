import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate enforcement of unique topic titles within a category during topic
 * update.
 *
 * This test simulates a real-world scenario where a discussion board member
 * tries to rename an existing topic so that its title conflicts with that of
 * another topic in the same category, which should be prohibited by business
 * rules. Specifically, the test:
 *
 * 1. Registers a member (for topic operations).
 * 2. Creates a new category (where both topics will reside).
 * 3. Creates two distinct topics within that category (each with a unique initial
 *    title).
 * 4. Tries to update the second topic's title to be identical to the first topic's
 *    title.
 * 5. Expects the update operation to fail due to the violation of the unique title
 *    constraint in the category, with a validation error being thrown.
 */
export async function test_api_discussionBoard_test_update_topic_with_duplicate_title_within_category(
  connection: api.IConnection,
) {
  // 1. Create a member for performing topic operations
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a category in which to test duplicate topic title constraint
  const categoryName = RandomGenerator.alphaNumeric(8);
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: categoryName,
        is_active: true,
      } satisfies IDiscussionBoardCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Create the first topic with a unique title
  const title1 = RandomGenerator.alphaNumeric(10);
  const topic1 = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: title1,
        discussion_board_category_id: category.id,
        pinned: false,
        closed: false,
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic1);

  // 4. Create the second topic, also with an initial unique title
  const title2 = RandomGenerator.alphaNumeric(10);
  const topic2 = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: title2,
        discussion_board_category_id: category.id,
        pinned: false,
        closed: false,
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic2);

  // 5. Attempt to update the second topic's title to that of the first topic, which should fail
  await TestValidator.error(
    "Updating second topic's title to a duplicate (first topic's title) should fail",
  )(() =>
    api.functional.discussionBoard.member.topics.update(connection, {
      topicId: topic2.id,
      body: {
        title: title1,
      } satisfies IDiscussionBoardTopics.IUpdate,
    }),
  );
}
