import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate uniqueness constraint for topic titles within the same category
 * during admin update (duplicate title error).
 *
 * This test ensures that when an admin attempts to update a topic's title to a
 * value already used by another topic in the same category, the operation fails
 * due to the uniqueness constraint. It confirms that the integrity of topic
 * title uniqueness within a category is enforced at the API level.
 *
 * **Test Steps:**
 *
 * 1. Register a discussion board member (for topic creation)
 * 2. Assign an admin account (for update permissions)
 * 3. Create a discussion board category (admin-only)
 * 4. Create two distinct topics under the category with unique titles
 * 5. Attempt to update the second topic's title to match the first (as admin)
 * 6. Verify that a uniqueness violation error occurs and the title is not updated
 */
export async function test_api_discussionBoard_test_update_topic_as_admin_duplicate_title_error(
  connection: api.IConnection,
) {
  // 1. Register a board member
  const memberIdentifier = RandomGenerator.alphabets(12);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberIdentifier,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Assign an admin
  const adminIdentifier = RandomGenerator.alphabets(13);
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: adminIdentifier,
        granted_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(admin);

  // 3. Create board category
  const categoryName = RandomGenerator.alphabets(10);
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: categoryName,
        is_active: true,
      },
    },
  );
  typia.assert(category);

  // 4. Create two topics under the same category (unique initial titles)
  const titleA = RandomGenerator.alphabets(15);
  const titleB = RandomGenerator.alphabets(15);
  const topicA = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: titleA,
        pinned: false,
        closed: false,
        discussion_board_category_id: category.id,
      },
    },
  );
  typia.assert(topicA);
  const topicB = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: titleB,
        pinned: false,
        closed: false,
        discussion_board_category_id: category.id,
      },
    },
  );
  typia.assert(topicB);
  // 5. Attempt admin update: change topicB title to topicA's (should violate uniqueness)
  await TestValidator.error(
    "admin cannot update topic title to a duplicate within same category",
  )(async () => {
    await api.functional.discussionBoard.admin.topics.update(connection, {
      topicId: topicB.id,
      body: { title: titleA },
    });
  });
}
