import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate restriction on creating threads in closed discussion topics.
 *
 * This test ensures that the API prevents creating a new thread under a topic
 * that is marked as closed (`closed: true`). According to business rules,
 * closed topics do not accept new threads—such as for locked or archived
 * discussions.
 *
 * Steps:
 *
 * 1. Fetch a topic by ID and verify it is closed (closed=true).
 * 2. Attempt to create a thread under this closed topic.
 * 3. Confirm that the system rejects the creation attempt with an error.
 *
 * Edge Cases:
 *
 * - If the selected topic is not closed, the test aborts to avoid false
 *   negatives.
 * - Only checks that an error occurs, not error message/type.
 * - Ensures test is robust against data setup drift in the backend.
 *
 * Note: In real E2E setup, ensure a closed topic exists in the test DB
 * (closed=true). If not, this test will abort with an error message for
 * maintainers.
 */
export async function test_api_discussionBoard_test_create_thread_in_closed_topic_returns_error(
  connection: api.IConnection,
) {
  // 1. Fetch a topic by ID (should be closed for the test)
  const closedTopic = await api.functional.discussionBoard.topics.at(
    connection,
    {
      topicId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(closedTopic);

  // 2. Validate that 'closed' is true, otherwise abort with explicit error
  if (!closedTopic.closed) {
    throw new Error(
      "[TEST FATAL] This E2E test requires a topic with closed=true. Please seed your test DB with a closed topic.",
    );
  }

  // 3. Attempt to create a thread under the closed topic; error must be thrown
  await TestValidator.error("Cannot create thread in closed topic")(() =>
    api.functional.discussionBoard.member.topics.threads.create(connection, {
      topicId: closedTopic.id,
      body: {
        title: "Test thread in closed topic " + RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardThreads.ICreate,
    }),
  );
}
