import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate topic update failure with an invalid category ID.
 *
 * This test ensures that the API properly rejects attempts to move a topic to a
 * nonexistent or inactive category. The workflow is as follows:
 *
 * 1. Create a discussion board member (the topic creator).
 * 2. Create a valid, active category.
 * 3. Create a topic as the member in that category.
 * 4. Attempt to update the topic, setting its category to a random (nonexistent)
 *    UUID, and verify an error is thrown.
 * 5. Create a second valid category, but with is_active=false.
 * 6. Attempt to update the topic to use the inactive category, and verify an error
 *    is thrown.
 *
 * The API should enforce referential integrity—only existing and active
 * categories are allowed. Errors should be thrown for violations.
 */
export async function test_api_discussionBoard_test_update_topic_with_invalid_category_id(
  connection: api.IConnection,
) {
  // 1. Create a board member
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Create a valid, active category
  const validCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        is_active: true,
      },
    });
  typia.assert(validCategory);

  // 3. Create a topic in the valid category
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        discussion_board_category_id: validCategory.id,
        pinned: false,
        closed: false,
      },
    },
  );
  typia.assert(topic);

  // 4. Try to move the topic to a nonexistent category
  const nonexistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.error("Moving topic to nonexistent category should fail")(
    async () => {
      await api.functional.discussionBoard.member.topics.update(connection, {
        topicId: topic.id,
        body: {
          discussion_board_category_id: nonexistentCategoryId,
        },
      });
    },
  );

  // 5. Create an inactive category
  const inactiveCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        is_active: false,
      },
    });
  typia.assert(inactiveCategory);

  // 6. Try to move the topic to the inactive category
  TestValidator.error("Moving topic to inactive category should fail")(
    async () => {
      await api.functional.discussionBoard.member.topics.update(connection, {
        topicId: topic.id,
        body: {
          discussion_board_category_id: inactiveCategory.id,
        },
      });
    },
  );
}
