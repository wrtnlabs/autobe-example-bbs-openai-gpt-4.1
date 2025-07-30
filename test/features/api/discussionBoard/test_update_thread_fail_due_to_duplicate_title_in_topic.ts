import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate prevention of thread title duplication within a topic upon update.
 *
 * This test simulates a business scenario in which the system must enforce the
 * business rule that thread titles within the same topic are unique, not just
 * on creation, but also when attempting to update an existing thread.
 *
 * Step-by-step process:
 *
 * 1. Register a board member who will create and update threads.
 * 2. Create a topic under which threads will be tested for duplicate title
 *    constraints.
 * 3. Create two threads under this topic, each with a unique title.
 * 4. Attempt to update the second thread's title to match the first thread's
 *    title. This should be rejected by the API due to the uniqueness
 *    constraint.
 * 5. (Optional) Verifying that the thread's title is unchanged post-failure is
 *    omitted due to lack of a 'get by id' endpoint in provided SDK.
 */
export async function test_api_discussionBoard_test_update_thread_fail_due_to_duplicate_title_in_topic(
  connection: api.IConnection,
) {
  // 1. Register a board member
  const memberUserId: string = RandomGenerator.alphaNumeric(12);
  const joinTime: string = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: memberUserId,
        joined_at: joinTime,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a topic (category id is randomized for test independence)
  const topicTitle = RandomGenerator.paragraph()(1).trim();
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    {
      body: {
        title: topicTitle,
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        description: RandomGenerator.paragraph()(1),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 3. Create two threads with unique titles in the topic
  const threadTitle1 = RandomGenerator.paragraph()(1).trim();
  const threadTitle2 = RandomGenerator.paragraph()(1).trim();

  const thread1 =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: threadTitle1,
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread1);

  const thread2 =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: threadTitle2,
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread2);

  // 4. Attempt to update second thread's title to be the same as the first (should error)
  await TestValidator.error("duplicate thread title update should be rejected")(
    async () => {
      await api.functional.discussionBoard.member.topics.threads.update(
        connection,
        {
          topicId: topic.id,
          threadId: thread2.id,
          body: {
            title: threadTitle1,
          } satisfies IDiscussionBoardThreads.IUpdate,
        },
      );
    },
  );

  // 5. (Optional): Cannot re-fetch thread to confirm unchanged title (no endpoint provided)
}
