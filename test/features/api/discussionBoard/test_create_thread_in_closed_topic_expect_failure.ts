import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate thread creation restriction when topic is closed.
 *
 * This test ensures that the system enforces the business rule: threads cannot
 * be created under a topic that is marked as "closed." The flow simulates an
 * admin performing all required actions.
 *
 * Step-by-step process:
 *
 * 1. Create an admin member (to act as both topic and thread creator).
 * 2. As admin, create a topic (with closed: false).
 * 3. Update that topic, setting its `closed` flag to true.
 * 4. Attempt to create a thread under the now-closed topic — expect this to fail
 *    (business logic error).
 * 5. Assert that the failure is due to violation of the "cannot create thread in
 *    closed topic" rule.
 */
export async function test_api_discussionBoard_test_create_thread_in_closed_topic_expect_failure(
  connection: api.IConnection,
) {
  // 1. Create an admin member
  const adminIdentifier: string = `admin-${RandomGenerator.alphaNumeric(8)}`;
  const adminJoinDate: string = new Date().toISOString();
  const admin = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: { user_identifier: adminIdentifier, joined_at: adminJoinDate },
    },
  );
  typia.assert(admin);

  // 2. Create a new topic (open by default)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const topic = await api.functional.discussionBoard.admin.topics.create(
    connection,
    {
      body: {
        title: `Test Topic ${RandomGenerator.alphabets(4)}`,
        description: "Topic for closed-thread test",
        pinned: false,
        closed: false,
        discussion_board_category_id: categoryId,
      },
    },
  );
  typia.assert(topic);
  TestValidator.equals("topic.closed is false initially")(topic.closed)(false);

  // 3. Mark the topic as closed
  const closedTopic = await api.functional.discussionBoard.admin.topics.update(
    connection,
    {
      topicId: topic.id,
      body: { closed: true },
    },
  );
  typia.assert(closedTopic);
  TestValidator.equals("topic.closed=true set")(closedTopic.closed)(true);

  // 4. Attempt to create a thread under the closed topic, expect failure
  await TestValidator.error("Cannot create thread in closed topic")(
    async () => {
      await api.functional.discussionBoard.admin.topics.threads.create(
        connection,
        {
          topicId: topic.id,
          body: { title: `Should Fail ${RandomGenerator.alphabets(6)}` },
        },
      );
    },
  );
}
