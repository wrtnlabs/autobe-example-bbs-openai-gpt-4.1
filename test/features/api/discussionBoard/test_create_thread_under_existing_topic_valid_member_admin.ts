import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Test the successful creation of a new thread as an admin under an existing
 * open topic.
 *
 * This test ensures that an admin member can create a new thread under a topic
 * that is open for participation. Steps include:
 *
 * 1. Register a new admin member (the creator for topics and threads).
 * 2. As this admin, create a topic with closed=false (open for threads).
 * 3. Create a new thread under the topic with a unique title.
 * 4. Validate the response fields for the thread (id, title, timestamps,
 *    associations).
 * 5. Validate association of thread to topic and creator.
 *
 * NOTE: No topic thread listing endpoint exists in the SDK as per given
 * functions, so that step is omitted.
 */
export async function test_api_discussionBoard_test_create_thread_under_existing_topic_valid_member_admin(
  connection: api.IConnection,
) {
  // 1. Register a discussion board admin member
  const adminUserIdentifier: string = RandomGenerator.alphaNumeric(16);
  const joinedAt: string = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: adminUserIdentifier,
        joined_at: joinedAt,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. As admin, create a new topic that is open for threads (closed: false)
  const topicTitle: string = RandomGenerator.alphaNumeric(12);
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
        description: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);
  TestValidator.equals("topic.closed is false (open topic)")(topic.closed)(
    false,
  );
  TestValidator.equals("topic.title matches request")(topic.title)(topicTitle);

  // 3. Create a thread under the topic
  const threadTitle: string = RandomGenerator.alphaNumeric(18);
  const thread =
    await api.functional.discussionBoard.admin.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: threadTitle,
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 4. Field verifications
  TestValidator.equals("thread title correctly set")(thread.title)(threadTitle);
  TestValidator.equals("thread topic id matches")(
    thread.discussion_board_topic_id,
  )(topic.id);
  TestValidator.equals("thread creator id matches")(thread.creator_member_id)(
    member.id,
  );
  TestValidator.predicate("thread id is uuid")(
    typeof thread.id === "string" && thread.id.length > 0,
  );
  TestValidator.predicate("thread created_at ISO string")(
    typeof thread.created_at === "string" &&
      !isNaN(Date.parse(thread.created_at)),
  );
  TestValidator.predicate("thread updated_at ISO string")(
    typeof thread.updated_at === "string" &&
      !isNaN(Date.parse(thread.updated_at)),
  );
}
