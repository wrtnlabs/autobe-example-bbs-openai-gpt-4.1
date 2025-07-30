import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Test successful update of a thread's title by the original thread creator
 * (member).
 *
 * This test validates the full workflow for a member user to update their own
 * thread's title under a discussion topic.
 *
 * Step-by-step process:
 *
 * 1. Register a new discussion board member (using admin/members endpoint)
 * 2. Create a new topic (admin/topics endpoint, with random category and details)
 * 3. The member creates a thread in that topic (with unique title)
 * 4. The thread creator updates the thread's title to a new unique value
 * 5. Verify the update response, all linkage fields, and persistency by applying a
 *    second update
 */
export async function test_api_discussionBoard_test_update_thread_success_by_thread_owner_member(
  connection: api.IConnection,
) {
  // 1. Register a new member (who will own the thread)
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphaNumeric(16),
    joined_at: new Date().toISOString(),
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberInput },
  );
  typia.assert(member);

  // 2. Create a topic as a prerequisite for the thread
  const topicInput: IDiscussionBoardTopics.ICreate = {
    title: RandomGenerator.paragraph()(1),
    description: RandomGenerator.paragraph()(),
    pinned: false,
    closed: false,
    discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    { body: topicInput },
  );
  typia.assert(topic);

  // 3. The member creates a thread with a unique title under the topic
  const threadInput: IDiscussionBoardThreads.ICreate = {
    title: RandomGenerator.alphaNumeric(24),
  };
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: threadInput,
      },
    );
  typia.assert(thread);
  TestValidator.equals("thread creator id matches")(thread.creator_member_id)(
    member.id,
  );
  TestValidator.equals("thread topic matches")(
    thread.discussion_board_topic_id,
  )(topic.id);

  // 4. The thread owner updates the title to a new unique title
  const newTitle = RandomGenerator.alphaNumeric(28);
  const updated =
    await api.functional.discussionBoard.member.topics.threads.update(
      connection,
      {
        topicId: topic.id,
        threadId: thread.id,
        body: {
          title: newTitle,
        },
      },
    );
  typia.assert(updated);
  TestValidator.equals("thread id unchanged")(updated.id)(thread.id);
  TestValidator.equals("updated title")(updated.title)(newTitle);
  TestValidator.notEquals("updated_at should change after update")(
    updated.updated_at,
  )(thread.updated_at);
  TestValidator.equals("creator remains same")(updated.creator_member_id)(
    member.id,
  );
  TestValidator.equals("topic unchanged after update")(
    updated.discussion_board_topic_id,
  )(topic.id);

  // 5. Persistency check: Update again and check for correct application/chaining
  const nextTitle = RandomGenerator.alphaNumeric(30);
  const doubleUpdate =
    await api.functional.discussionBoard.member.topics.threads.update(
      connection,
      {
        topicId: topic.id,
        threadId: thread.id,
        body: { title: nextTitle },
      },
    );
  typia.assert(doubleUpdate);
  TestValidator.equals("thread id persists through updates")(doubleUpdate.id)(
    thread.id,
  );
  TestValidator.equals("title updated second time")(doubleUpdate.title)(
    nextTitle,
  );
}
