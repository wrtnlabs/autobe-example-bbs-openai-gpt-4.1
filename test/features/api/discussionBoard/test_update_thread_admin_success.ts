import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate that an admin user can update any thread's core fields within any
 * topic.
 *
 * This test simulates the following business scenario:
 *
 * 1. An admin registers on the discussion board system.
 * 2. A regular member is registered as well.
 * 3. The admin creates a topic under the board for thread creation.
 * 4. The member creates a thread under the topic.
 * 5. The admin updates the thread's title to a new value using the admin endpoint.
 * 6. The test confirms the thread fields have been updated correctly in the
 *    returned value and changes persist by fetching the thread again if
 *    possible.
 *
 * This test ensures admin privileges are properly enforced for thread edits,
 * topic/thread relations are respected, and changes are consistently applied
 * and returned by the API.
 */
export async function test_api_discussionBoard_test_update_thread_admin_success(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const admin: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: RandomGenerator.alphabets(8),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(admin);

  // 2. Register a member
  const member: IDiscussionBoardMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: RandomGenerator.alphabets(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 3. Admin creates a topic (under a random category for test)
  const topic: IDiscussionBoardTopics =
    await api.functional.discussionBoard.admin.topics.create(connection, {
      body: {
        title: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    });
  typia.assert(topic);

  // 4. Member creates a thread under the topic
  const thread: IDiscussionBoardThreads =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.alphabets(16),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);
  TestValidator.equals("thread belongs to topic")(
    thread.discussion_board_topic_id,
  )(topic.id);
  TestValidator.equals("thread creator member id")(thread.creator_member_id)(
    member.id,
  );

  // 5. Admin updates the thread
  const newTitle = RandomGenerator.alphabets(20);
  const updatedThread: IDiscussionBoardThreads =
    await api.functional.discussionBoard.admin.topics.threads.update(
      connection,
      {
        topicId: topic.id,
        threadId: thread.id,
        body: {
          title: newTitle,
        } satisfies IDiscussionBoardThreads.IUpdate,
      },
    );
  typia.assert(updatedThread);
  TestValidator.equals("updated thread id")(updatedThread.id)(thread.id);
  TestValidator.equals("updated title")(updatedThread.title)(newTitle);

  // 6. (Optional) Fetch updated thread again - not possible directly, so rely on returned response validation
  // If a thread fetch endpoint existed, fetch the thread and confirm again.
}
