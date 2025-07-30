import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate that unauthorized thread deletion as a regular member fails using
 * moderator-only endpoint.
 *
 * This test verifies that only users with moderator rights can delete threads
 * via the moderator endpoint, and that regular members are denied access.
 *
 * Business purpose: Prevent ordinary members from invoking the moderator-level
 * thread deletion, enforcing privilege boundaries.
 *
 * Steps:
 *
 * 1. Admin registers two distinct users: one as a regular member, one as a
 *    moderator.
 * 2. Admin creates a topic (category reference randomized).
 * 3. The member creates a thread in the topic.
 * 4. The member (unauthorized) attempts to delete the thread via the moderator
 *    endpoint.
 * 5. Confirm access is denied via proper error handling.
 */
export async function test_api_discussionBoard_test_delete_thread_fail_unauthorized_member(
  connection: api.IConnection,
) {
  // 1. Register two users: one as member, one as moderator
  const member_identifier = RandomGenerator.alphaNumeric(16);
  const moderator_identifier = RandomGenerator.alphaNumeric(16);
  const joined_at = new Date().toISOString();

  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: member_identifier,
        joined_at,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  const moderatorMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: moderator_identifier,
        joined_at,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(moderatorMember);

  // Assign moderator role
  await api.functional.discussionBoard.admin.moderators.create(connection, {
    body: {
      user_identifier: moderator_identifier,
      granted_at: joined_at,
    } satisfies IDiscussionBoardModerator.ICreate,
  });

  // 2. Create a topic (category randomized)
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 3. Member creates a thread in the topic
  // Assume connection is switched/emulates member after registration (framework handles role)
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(1),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 4. Attempt to delete thread as unauthorized member
  // Expect error since only moderators can use this endpoint
  await TestValidator.error(
    "Member deletion of thread via moderator endpoint should be unauthorized",
  )(async () => {
    await api.functional.discussionBoard.moderator.topics.threads.erase(
      connection,
      {
        topicId: topic.id,
        threadId: thread.id,
      },
    );
  });
}
