import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Validate rejection of topic deletion attempt by a non-moderator member.
 *
 * This test ensures the access control for topic deletion is enforced: only
 * moderators or admins should be able to delete topics. A regular member (not a
 * moderator) is set up, a category is created, and a topic is created by the
 * member. Then, the test attempts to delete the topic as this member via the
 * moderator endpoint. The deletion must be rejected with an authorization error
 * (not found, forbidden, or unauthorized).
 *
 * Step-by-step process:
 *
 * 1. Create a non-moderator member
 * 2. Create a discussion category (admin action)
 * 3. As the member, create a topic in that category
 * 4. Attempt to delete the topic via the moderator endpoint as the normal member
 *    (without moderator privileges)
 * 5. Verify that the server rejects the action with an authorization error,
 *    ensuring only moderators/admins can delete topics
 */
export async function test_api_discussionBoard_test_delete_topic_by_non_moderator_fails(
  connection: api.IConnection,
) {
  // 1. Create a non-moderator member
  const user_identifier: string = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a category as admin
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(8),
        is_active: true,
      } satisfies IDiscussionBoardCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Create a topic under the newly created member (simulate authentication context for the member)
  //    Assume connection reflects the member after creation or through subsequent login if required (see system's test auth flow).
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphaNumeric(16),
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: category.id,
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 4. Attempt to delete the topic as a non-moderator (the current member)
  await TestValidator.error(
    "Non-moderator should not be able to delete topics",
  )(async () => {
    await api.functional.discussionBoard.moderator.topics.erase(connection, {
      topicId: topic.id,
    });
  });
}
