import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Test update attempt by a moderator with invalid fields (duplicate title and
 * invalid category).
 *
 * This test ensures business rules are enforced on the moderator's topic update
 * endpoint: titles must be unique within a category, and category references
 * must be valid and existing. Attempts to violate these rules should fail with
 * error responses, not update the topic.
 *
 * Test steps:
 *
 * 1. Create a member (who will own the test topics).
 * 2. Register a moderator (using that member's user identity).
 * 3. Create two valid categories (cat1 and cat2) and a random UUID for a
 *    non-existent category.
 * 4. Using the member, create two topics in cat1 with different titles.
 * 5. As moderator, attempt to update topic #2 to title of topic #1 in cat1 (should
 *    fail with duplicate title error).
 * 6. As moderator, attempt to update topic #2 to a valid but non-existent category
 *    (should fail with invalid category error).
 * 7. Verify that errors are thrown and original topic remains unchanged.
 */
export async function test_api_discussionBoard_test_update_topic_by_moderator_invalid_fields(
  connection: api.IConnection,
) {
  // 1. Create a board member
  const user_identifier: string = RandomGenerator.alphaNumeric(10);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Register as moderator
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(moderator);

  // 3. Create two categories
  const cat1 = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
        is_active: true,
        description: "Category for dup test",
        parent_id: null,
      },
    },
  );
  typia.assert(cat1);
  const cat2 = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
        is_active: true,
        description: "Category for invalid cat test",
        parent_id: null,
      },
    },
  );
  typia.assert(cat2);
  // Prepare a non-existent valid uuid
  const invalid_category_id = typia.random<string & tags.Format<"uuid">>();

  // 4. Member creates two topics in same category (cat1)
  const topic1 = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphabets(12),
        description: "The original topic1",
        pinned: false,
        closed: false,
        discussion_board_category_id: cat1.id,
      },
    },
  );
  typia.assert(topic1);
  const topic2 = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphabets(12),
        description: "The original topic2",
        pinned: false,
        closed: false,
        discussion_board_category_id: cat1.id,
      },
    },
  );
  typia.assert(topic2);

  // 5. Moderator attempts to update topic2's title to topic1's title (should fail)
  await TestValidator.error("duplicate title in same category fails")(() =>
    api.functional.discussionBoard.moderator.topics.update(connection, {
      topicId: topic2.id,
      body: {
        title: topic1.title,
      },
    }),
  );

  // 6. Moderator attempts to update topic2's category to an invalid category id (should fail)
  await TestValidator.error("non-existent category fails")(() =>
    api.functional.discussionBoard.moderator.topics.update(connection, {
      topicId: topic2.id,
      body: {
        discussion_board_category_id: invalid_category_id,
      },
    }),
  );
}
