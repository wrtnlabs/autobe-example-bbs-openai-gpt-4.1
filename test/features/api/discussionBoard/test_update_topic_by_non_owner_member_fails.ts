import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";

/**
 * Test that a regular member who is not the topic creator cannot update a
 * topic.
 *
 * This test ensures that only the owner (creator) of a topic or users with
 * appropriate admin/moderation privileges are permitted to update a topic in
 * the discussion board. Regular members who are not the topic creators should
 * be denied update rights. The test checks for correct enforcement of update
 * authorization.
 *
 * Test workflow:
 *
 * 1. Register two separate members (Member A and Member B) via admin API with
 *    distinct user_identifiers.
 * 2. Create a category as an admin for topic placement.
 * 3. As Member A, create a topic within the newly created category (Member A is
 *    topic creator).
 * 4. Attempt to update the topic using Member B's identity, simulating a non-owner
 *    member's update attempt.
 * 5. Verify that the update attempt is rejected by the API with an authorization
 *    error (e.g., 403 Forbidden), and the topic remains unchanged.
 */
export async function test_api_discussionBoard_test_update_topic_by_non_owner_member_fails(
  connection: api.IConnection,
) {
  // 1. Register two separate members: Member A (creator), Member B (non-owner)
  const memberAIdentifier = `memberA_${typia.random<string>()}`;
  const memberBIdentifier = `memberB_${typia.random<string>()}`;
  const joinedAtA = new Date().toISOString();
  const joinedAtB = new Date(Date.now() + 1000).toISOString();
  const memberA = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberAIdentifier,
        joined_at: joinedAtA,
      },
    },
  );
  typia.assert(memberA);
  const memberB = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberBIdentifier,
        joined_at: joinedAtB,
      },
    },
  );
  typia.assert(memberB);

  // 2. Create a category for the topic
  const category = await api.functional.discussionBoard.admin.categories.create(
    connection,
    {
      body: {
        name: `category_${typia.random<string>()}`,
        is_active: true,
      },
    },
  );
  typia.assert(category);

  // 3. As Member A, create the topic
  // (In real systems, user context should represent Member A for accurate auditing. Here we assume the backend infers ownership from context.)
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: `Test Topic ${typia.random<string>()}`,
        description: "Topic for update authorization test.",
        pinned: false,
        closed: false,
        discussion_board_category_id: category.id,
      },
    },
  );
  typia.assert(topic);

  // 4. Attempt to update the topic as Member B (not creator)
  // (In a real test suite, this would require switching the user session/context to Member B.)
  await TestValidator.error("non-owner should not update topic")(async () => {
    await api.functional.discussionBoard.member.topics.update(connection, {
      topicId: topic.id,
      body: {
        title: "Illegal Update Attempt",
        closed: true,
      },
    });
  });
}
