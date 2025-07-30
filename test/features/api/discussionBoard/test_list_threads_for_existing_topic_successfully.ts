import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IPageIDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThreads";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";

/**
 * Test retrieving a paginated list of threads for an existing discussion topic
 * as a guest or authenticated user.
 *
 * This test verifies the following business logic:
 *
 * 1. Successfully retrieve the details of an existing topic to ensure it exists
 *    and is active.
 * 2. Create multiple threads under this topic as prerequisite data (using an
 *    authenticated connection).
 * 3. Retrieve a paginated list of threads for this topic (no authentication
 *    required).
 * 4. Validate all returned threads belong to the correct topic, pagination
 *    metadata is present, and that created test threads are included in the
 *    list.
 * 5. Ensure pagination object is logically consistent.
 *
 * Steps:
 *
 * 1. Fetch topic by ID to ensure it exists.
 * 2. Create three threads under that topic.
 * 3. List threads for that topic (guest access).
 * 4. For each returned thread summary, check its topic ID.
 * 5. Validate the pagination metadata.
 */
export async function test_api_discussionBoard_test_list_threads_for_existing_topic_successfully(
  connection: api.IConnection,
) {
  // 1. Retrieve the details of a valid discussion topic
  const topic = await api.functional.discussionBoard.topics.at(connection, {
    topicId: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(topic);

  // 2. Create multiple threads under this topic as prerequisite data
  const threadTitles: string[] = [
    `Thread A ${RandomGenerator.alphaNumeric(6)}`,
    `Thread B ${RandomGenerator.alphaNumeric(6)}`,
    `Thread C ${RandomGenerator.alphaNumeric(6)}`,
  ];
  const createdThreads = [];
  for (const title of threadTitles) {
    const thread =
      await api.functional.discussionBoard.member.topics.threads.create(
        connection,
        {
          topicId: topic.id,
          body: { title } satisfies IDiscussionBoardThreads.ICreate,
        },
      );
    typia.assert(thread);
    createdThreads.push(thread);
  }

  // 3. Retrieve the paginated list of threads for this topic
  const threadPage = await api.functional.discussionBoard.topics.threads.index(
    connection,
    {
      topicId: topic.id,
    },
  );
  typia.assert(threadPage);

  // 4. Validate all returned thread summaries belong to the test topic
  for (const summary of threadPage.data) {
    TestValidator.equals(
      "thread's discussion_board_topic_id matches the topic.id",
    )(summary.discussion_board_topic_id)(topic.id);
  }

  // 5. Validate that the pagination object exists and has logical values
  const p = threadPage.pagination;
  TestValidator.predicate("pagination.current is a valid page number")(
    typeof p.current === "number" && p.current >= 1,
  );
  TestValidator.predicate("pagination.limit is a valid per-page limit")(
    typeof p.limit === "number" && p.limit >= 1,
  );
  TestValidator.predicate("pagination.records is nonnegative")(
    typeof p.records === "number" && p.records >= 0,
  );
  TestValidator.predicate("pagination.pages is at least one")(
    typeof p.pages === "number" && p.pages >= 1,
  );
  // Optionally verify that at least the three test thread titles are present in data
  for (const created of createdThreads) {
    TestValidator.predicate("created thread exists in the list")(
      threadPage.data.some((summary) => summary.id === created.id),
    );
  }
}
