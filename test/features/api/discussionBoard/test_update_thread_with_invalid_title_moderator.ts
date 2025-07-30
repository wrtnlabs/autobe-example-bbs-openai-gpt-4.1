import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate input constraints for updating threads as a moderator: blank or
 * overlength titles should fail.
 *
 * Scenario:
 *
 * 1. Create admin-controlled moderator and member via API (for test isolation).
 * 2. Admin creates topic for the test.
 * 3. Member creates thread with a valid title in the topic.
 * 4. As moderator, attempt to update thread title to '' (blank string) and to an
 *    overlength string (>255 chars).
 * 5. Assert that both attempts result in input validation error (error thrown).
 *
 * Steps:
 *
 * - Moderator created via POST /discussionBoard/admin/moderators and retains
 *   token via connection.
 * - Member created via POST /discussionBoard/admin/members.
 * - Topic created via POST /discussionBoard/admin/topics.
 * - Thread created by member via POST
 *   /discussionBoard/member/topics/{topicId}/threads.
 * - Switch to moderator, perform updates using PUT
 *   /discussionBoard/moderator/topics/{topicId}/threads/{threadId} with invalid
 *   titles.
 * - Validate errors are thrown as expected.
 */
export async function test_api_discussionBoard_test_update_thread_with_invalid_title_moderator(
  connection: api.IConnection,
) {
  // 1. Admin creates moderator user
  const moderator_identifier = typia.random<string>();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderator_identifier,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(moderator);

  // 2. Admin creates member user (thread creator)
  const member_identifier = typia.random<string>();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: member_identifier,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 3. Admin creates topic
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphaNumeric(16),
        description: RandomGenerator.alphaNumeric(32),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(topic);

  // 4. Member creates a valid thread in the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.alphaNumeric(8),
        },
      },
    );
  typia.assert(thread);

  // 5.a. Moderator tries to set blank title
  await TestValidator.error("should reject blank title")(() =>
    api.functional.discussionBoard.moderator.topics.threads.update(connection, {
      topicId: topic.id,
      threadId: thread.id,
      body: { title: "" },
    }),
  );

  // 5.b. Moderator tries to set too-long title (e.g. 300 chars)
  const longTitle = RandomGenerator.alphaNumeric(300);
  await TestValidator.error("should reject title over length limit")(() =>
    api.functional.discussionBoard.moderator.topics.threads.update(connection, {
      topicId: topic.id,
      threadId: thread.id,
      body: { title: longTitle },
    }),
  );
}
