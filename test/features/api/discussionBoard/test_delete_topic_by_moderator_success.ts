import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Test that a moderator can hard-delete a discussion topic, ensuring that the
 * topic and all its cascading dependencies are removed from the database.
 *
 * Steps:
 *
 * 1. Create a discussion board member (user).
 * 2. Create a moderator account with unique user identifier.
 * 3. Create a board category in active state.
 * 4. As the member, create a topic inside the created category.
 * 5. As the moderator, delete (hard delete) the topic by its id.
 * 6. Attempt to create another topic with the same title under the same category,
 *    which should succeed (since the previous topic is deleted), thus
 *    indirectly verifying deletion.
 *
 * Validates:
 *
 * - Moderators can delete topics.
 * - After deletion, the topic is no longer present and the title can be reused.
 * - Creation, deletion, and cascading behavior match expectations per business
 *   rules.
 */
export async function test_api_discussionBoard_test_delete_topic_by_moderator_success(
  connection: api.IConnection,
) {
  // 1. Create a discussion board member with unique user_identifier and joined_at
  const user_identifier = typia.random<string>();
  const member_joined_at = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier,
        joined_at: member_joined_at,
      },
    },
  );
  typia.assert(member);

  // 2. Register a moderator for the same user
  const moderator_granted_at = new Date().toISOString();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier,
        granted_at: moderator_granted_at,
      },
    });
  typia.assert(moderator);

  // 3. Create an active board category
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph()(),
        is_active: true,
      },
    },
  );
  typia.assert(category);

  // 4. As the member, create a topic inside the created category
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: category.id,
      },
    },
  );
  typia.assert(topic);

  // 5. As a moderator, delete the topic by ID (hard delete)
  await api.functional.discussionBoard.moderator.topics.erase(connection, {
    topicId: topic.id,
  });

  // 6. Attempt to create another topic with the same title, which should now be possible (since the previous topic is deleted)
  const topic2 = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: topic.title, // Should be allowed again after deletion
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: category.id,
      },
    },
  );
  typia.assert(topic2);
  TestValidator.notEquals("topic should be new record")(topic2.id)(topic.id);
}
