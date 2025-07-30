import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IPageIDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThreads";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Validate thread listing on an empty topic returns an empty list.
 *
 * This test ensures that the "list threads in topic" endpoint behaves correctly
 * when the target topic exists but contains no threads. The test will:
 *
 * 1. Fetch (or ensure) the target topic exists by retrieving its full details.
 * 2. Call the threads listing endpoint for the topic (with no threads present).
 * 3. Assert that the returned page data array is empty, and pagination fields are
 *    correct (records=0, current=1 or as per default, etc.).
 *
 * This verifies the API returns a correct empty page structure, not an error or
 * null, for the valid but empty state (no threads yet created).
 */
export async function test_api_discussionBoard_test_list_threads_for_topic_with_no_threads_returns_empty_list(
  connection: api.IConnection,
) {
  // 1. Fetch an existing topic (the scenario depends on a dependency: getTopic)
  //    If the system supports topic creation, ensure the topic is fresh with no threads
  //    (Here we just fetch as scenario says "topic exists but has no threads")
  const topic: IDiscussionBoardTopics =
    await api.functional.discussionBoard.topics.at(connection, {
      topicId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(topic);

  // 2. Call the threads listing endpoint for the topic
  const threadsPage = await api.functional.discussionBoard.topics.threads.index(
    connection,
    {
      topicId: topic.id,
    },
  );
  typia.assert(threadsPage);

  // 3. Assert that the data array is empty and pagination matches 0 records
  TestValidator.equals("no threads data")(threadsPage.data)([]);
  TestValidator.equals("pagination.records == 0")(
    threadsPage.pagination.records,
  )(0);
}
