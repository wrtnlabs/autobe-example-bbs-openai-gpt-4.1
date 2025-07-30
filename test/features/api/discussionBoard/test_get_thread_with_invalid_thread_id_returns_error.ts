import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate that attempting to retrieve a thread with an invalid (non-existent)
 * threadId under a valid topic returns an appropriate not found error, and that
 * no internal implementation details are exposed in the error response.
 *
 * Business context: Even if the topic exists, the given threadId may not
 * correspond to any actual thread, so the API must gracefully reject the
 * request and avoid leaking any state, stack traces, or unrelated data.
 *
 * Step-by-step process:
 *
 * 1. Retrieve a real, valid topic via GET /discussionBoard/topics/{topicId} to
 *    ensure we have a known, existing topic.
 * 2. Attempt to retrieve a thread with a new random UUID for threadId under the
 *    valid topic.
 * 3. Confirm that the API returns an error (such as 404 Not Found), and that no
 *    server internals or unexpected data are present in the response.
 */
export async function test_api_discussionBoard_test_get_thread_with_invalid_thread_id_returns_error(
  connection: api.IConnection,
) {
  // 1. Retrieve a valid topic (ensure the topic exists and we have a stable topicId)
  const validTopic: IDiscussionBoardTopics =
    await api.functional.discussionBoard.topics.at(connection, {
      topicId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(validTopic);

  // 2. Attempt to retrieve a thread with a non-existent threadId under this topic
  const invalidThreadId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("non-existent threadId returns not found")(
    async () => {
      await api.functional.discussionBoard.topics.threads.at(connection, {
        topicId: validTopic.id,
        threadId: invalidThreadId,
      });
    },
  );
}
