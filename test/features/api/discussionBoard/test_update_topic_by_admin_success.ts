import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate that an admin can update any topic, regardless of ownership.
 *
 * This test ensures that admin users can update crucial fields (title,
 * description, category, state) of any topic, regardless of who created it.
 * This guarantees correct privilege enforcement in the discussion board admin
 * panel.
 *
 * Step-by-step process:
 *
 * 1. Register a new discussion board member – this will be the topic's creator.
 * 2. Register a user as admin for update privilege.
 * 3. Create a discussion board category for topic placement.
 * 4. Insert a topic via the member in that category.
 * 5. Create a new board category (for verifying category update).
 * 6. As admin, update the topic: change the title, update the description, move to
 *    the new category, and change pinned/closed status.
 * 7. Validate that all updated information is correctly saved and visible, proving
 *    the admin privilege works as expected.
 */
export async function test_api_discussionBoard_test_update_topic_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a board member (the topic creator)
  const creator_identifier: string = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: creator_identifier,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Register an admin user
  const admin_identifier: string = RandomGenerator.alphaNumeric(14);
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: admin_identifier,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      } satisfies IDiscussionBoardAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 3. Create a board category for the original topic
  const category_in: IDiscussionBoardCategory.ICreate = {
    name: RandomGenerator.paragraph()(1, 2),
    description: RandomGenerator.paragraph()(),
    parent_id: null,
    is_active: true,
  };
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    { body: category_in },
  );
  typia.assert(category);

  // 4. Member creates a topic in that category
  const topic_create_body: IDiscussionBoardTopics.ICreate = {
    title: RandomGenerator.paragraph()(1, 2),
    description: RandomGenerator.paragraph()(),
    pinned: false,
    closed: false,
    discussion_board_category_id: category.id,
  };
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    { body: topic_create_body },
  );
  typia.assert(topic);

  // 5. Create a new category to update to
  const new_category_in: IDiscussionBoardCategory.ICreate = {
    name: RandomGenerator.paragraph()(1, 2),
    description: RandomGenerator.paragraph()(),
    parent_id: null,
    is_active: true,
  };
  const new_category =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: new_category_in,
    });
  typia.assert(new_category);

  // 6. Update the topic as admin
  const update_body: IDiscussionBoardTopics.IUpdate = {
    title: RandomGenerator.paragraph()(1, 2),
    description: RandomGenerator.paragraph()(),
    pinned: true,
    closed: true,
    discussion_board_category_id: new_category.id,
  };
  const updated = await api.functional.discussionBoard.admin.topics.update(
    connection,
    {
      topicId: topic.id,
      body: update_body,
    },
  );
  typia.assert(updated);

  // 7. Validate the update applied as intended
  TestValidator.equals("topic title updated")(updated.title)(update_body.title);
  TestValidator.equals("description updated")(updated.description)(
    update_body.description,
  );
  TestValidator.equals("category changed")(
    updated.discussion_board_category_id,
  )(new_category.id);
  TestValidator.equals("is pinned")(updated.pinned)(true);
  TestValidator.equals("is closed")(updated.closed)(true);
}
