import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Test moderator thread creation in an existing, active discussion topic.
 *
 * This test verifies that a user with moderator privileges can create a new
 * thread in an already-existing, open topic, using their elevated API endpoint.
 * It asserts that the thread follows all normal creation rules (unique title
 * per topic), correct association to parent topic, and records the moderator as
 * creator. The response is checked for structure and business validity.
 *
 * **Test Steps:**
 *
 * 1. Fetch an existing discussion topic (dependency ensures valid, existing
 *    topic).
 * 2. Verify the topic allows new threads (not closed).
 * 3. Use moderator endpoint to create a new thread with a unique title.
 * 4. Confirm the thread is associated with the chosen topic, title matches, and
 *    creator field is present.
 */
export async function test_api_discussionBoard_test_create_thread_as_moderator_in_valid_topic(
  connection: api.IConnection,
) {
  // 1. Retrieve an existing, active discussion topic
  const topic = await api.functional.discussionBoard.topics.at(connection, {
    topicId: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(topic);

  // 2. Ensure the topic is open (not closed)
  if (topic.closed)
    throw new Error("Cannot create thread: topic is closed for new threads.");

  // 3. Create a thread as moderator with a unique per-topic title
  const uniqueTitle = `Moderator Thread ${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    title: uniqueTitle,
  } satisfies IDiscussionBoardThreads.ICreate;
  const output =
    await api.functional.discussionBoard.moderator.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: createBody,
      },
    );
  typia.assert(output);

  // 4. Business assertions: thread links to topic, unique title, creator present
  TestValidator.equals("thread belongs to topic")(
    output.discussion_board_topic_id,
  )(topic.id);
  TestValidator.equals("thread title matches")(output.title)(uniqueTitle);
  TestValidator.predicate("thread creator_member_id exists")(
    typeof output.creator_member_id === "string" &&
      output.creator_member_id.length > 0,
  );
}
