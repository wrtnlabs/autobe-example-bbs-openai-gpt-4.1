import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate that a moderator can update any topic, regardless of the creator.
 *
 * This test simulates a realistic workflow:
 *
 * 1. Create a member (topic creator)
 * 2. Create a moderator user (distinct from member)
 * 3. Create a category (for the topic's initial assignment)
 * 4. As the member, create a topic in the category
 * 5. As the moderator, update that topic: set new title, description, reassign to
 *    another category, and change pinned/closed state (all fields)
 * 6. Validate all changes succeeded and that creator field remains unchanged
 */
export async function test_api_discussionBoard_test_update_topic_by_moderator_success(
  connection: api.IConnection,
) {
  // 1. Create a member as topic creator
  const memberUserId = RandomGenerator.alphaNumeric(10);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberUserId,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Create a moderator with distinct user ID
  const moderatorUserId = RandomGenerator.alphaNumeric(12);
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderatorUserId,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(moderator);

  // 3. Create a first category for the topic
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
        description: RandomGenerator.paragraph()(1),
        parent_id: null,
        is_active: true,
      },
    },
  );
  typia.assert(category);

  // 4. As member, create a topic in this category
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphabets(12),
        description: RandomGenerator.paragraph()(1),
        pinned: false,
        closed: false,
        discussion_board_category_id: category.id,
      },
    },
  );
  typia.assert(topic);

  // 5. As moderator, update all fields of the topic (new values for each)
  //    Including a reassignment to a new category
  const newCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.alphabets(9),
        description: RandomGenerator.paragraph()(1),
        parent_id: null,
        is_active: true,
      },
    });
  typia.assert(newCategory);

  const updatedTitle = RandomGenerator.alphabets(14);
  const updatedDescription = RandomGenerator.paragraph()(1);

  const updatedTopic =
    await api.functional.discussionBoard.moderator.topics.update(connection, {
      topicId: topic.id,
      body: {
        title: updatedTitle,
        description: updatedDescription,
        pinned: true,
        closed: true,
        discussion_board_category_id: newCategory.id,
      },
    });
  typia.assert(updatedTopic);

  // 6. Validate: All fields updated, creator/ownership unchanged
  TestValidator.equals("updated title")(updatedTopic.title)(updatedTitle);
  TestValidator.equals("updated description")(updatedTopic.description)(
    updatedDescription,
  );
  TestValidator.equals("updated pinned")(updatedTopic.pinned)(true);
  TestValidator.equals("updated closed")(updatedTopic.closed)(true);
  TestValidator.equals("updated category")(
    updatedTopic.discussion_board_category_id,
  )(newCategory.id);
  TestValidator.equals("creator invariant")(updatedTopic.creator_member_id)(
    topic.creator_member_id,
  );
}
