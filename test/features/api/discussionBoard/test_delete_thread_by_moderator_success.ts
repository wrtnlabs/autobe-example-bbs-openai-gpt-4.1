import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Test successful hard deletion of a discussion board thread by a moderator.
 *
 * This test simulates the complete workflow required to delete a thread via
 * moderator privilege, including full setup and teardown checks permitted by
 * available API endpoints.
 *
 * 1. Register a moderator user (unique user_identifier, valid datetime)
 * 2. Register a member user (thread creator, different identifier)
 * 3. Create a topic in which to create the thread (category UUID is randomly
 *    generated)
 * 4. Member creates a new thread in this topic
 * 5. Moderator deletes the newly created thread (hard delete)
 * 6. As there is no listing or detail API for thread after delete among available
 *    endpoints, post-condition checks are omitted
 *
 * Unavailable or unimplementable steps (like verifying absence from thread list
 * or cascading delete child entities) are skipped as per requirements.
 */
export async function test_api_discussionBoard_test_delete_thread_by_moderator_success(
  connection: api.IConnection,
) {
  // 1. Register a moderator user (using a unique user_identifier)
  const moderatorUserIdentifier = RandomGenerator.alphaNumeric(12);
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderatorUserIdentifier,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(moderator);

  // 2. Register a member user who will be the thread creator (using a different identifier)
  const memberUserIdentifier = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberUserIdentifier,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 3. Create a new topic for the thread
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(8),
        description: RandomGenerator.paragraph()(20),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(topic);

  // 4. Member creates a thread in the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(6),
        },
      },
    );
  typia.assert(thread);

  // 5. Moderator deletes the thread (hard delete - cascades handled in DB)
  await api.functional.discussionBoard.moderator.topics.threads.erase(
    connection,
    {
      topicId: topic.id,
      threadId: thread.id,
    },
  );

  // 6. Verification of thread absence is omitted due to lack of available endpoint
}
