import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Test updating core fields of a discussion topic by the creator member with
 * valid and unique data.
 *
 * Validates the workflow in which a board member who owns a topic successfully
 * updates its fields:
 *
 * - Title, description, pinned, closed, and discussion_board_category_id can all
 *   be changed if the API is used by the topic creator.
 *
 * Steps:
 *
 * 1. Create a new member via the admin members API with a unique identifier and
 *    join time.
 * 2. Create a new, active, uniquely named category.
 * 3. As the member, create a topic in the category with unique properties.
 * 4. Create a second unique, active category for category-change testing.
 * 5. Update the topic (as the creator member) to change all modifiable fields to
 *    new values, including moving it to the new category.
 * 6. Assert that the response reflects all intended changes and critical fields
 *    unchanged.
 */
export async function test_api_discussionBoard_test_update_topic_with_valid_data_by_creator_member(
  connection: api.IConnection,
) {
  // 1. Create a new member (admin API)
  const newUserIdentifier = "member-" + RandomGenerator.alphaNumeric(8);
  const memberJoinTime = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: newUserIdentifier,
        joined_at: memberJoinTime,
      },
    },
  );
  typia.assert(member);

  // 2. Create an active category with unique name
  const categoryName = "cat-" + RandomGenerator.alphaNumeric(12);
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: categoryName,
        is_active: true,
        description: RandomGenerator.paragraph()(),
        parent_id: null,
      },
    },
  );
  typia.assert(category);

  // 3. As the member, create a topic in the category
  const topicTitle = "topic-" + RandomGenerator.alphaNumeric(10);
  const topicCreate = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: topicTitle,
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: category.id,
      },
    },
  );
  typia.assert(topicCreate);

  // 4. Create a second active, unique category for category-change test
  const category2Name = "cat2-" + RandomGenerator.alphaNumeric(10);
  const category2 =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: category2Name,
        is_active: true,
        description: RandomGenerator.paragraph()(),
        parent_id: null,
      },
    });
  typia.assert(category2);

  // 5. Update the topic (as creator) to change all fields
  const newTitle = "topic-updated-" + RandomGenerator.alphaNumeric(10);
  const newDescription = RandomGenerator.paragraph()();
  const updateBody = {
    title: newTitle,
    description: newDescription,
    pinned: true,
    closed: true,
    discussion_board_category_id: category2.id,
  } satisfies IDiscussionBoardTopics.IUpdate;
  const updatedTopic =
    await api.functional.discussionBoard.member.topics.update(connection, {
      topicId: topicCreate.id,
      body: updateBody,
    });
  typia.assert(updatedTopic);

  // 6. Assert updated values and unchanged core properties
  TestValidator.equals("updated title")(updatedTopic.title)(newTitle);
  TestValidator.equals("updated description")(updatedTopic.description)(
    newDescription,
  );
  TestValidator.equals("updated pinned")(updatedTopic.pinned)(true);
  TestValidator.equals("updated closed")(updatedTopic.closed)(true);
  TestValidator.equals("updated category")(
    updatedTopic.discussion_board_category_id,
  )(category2.id);
  TestValidator.equals("creator unchanged")(updatedTopic.creator_member_id)(
    topicCreate.creator_member_id,
  );
  TestValidator.equals("id unchanged")(updatedTopic.id)(topicCreate.id);
}
