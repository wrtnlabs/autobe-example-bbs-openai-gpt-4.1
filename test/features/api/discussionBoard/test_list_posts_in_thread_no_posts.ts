import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate retrieving the list of posts for a thread with no posts.
 *
 * This test ensures the system correctly returns an empty, paginated list with
 * no errors when asked for posts from a new, valid thread that has not had any
 * posts added yet. This verifies proper handling and response structure in the
 * 'empty thread' scenario.
 *
 * Steps:
 *
 * 1. Create a topic as parent (dependency).
 * 2. Create a thread under the topic (dependency, no posts created).
 * 3. List posts for the new thread.
 * 4. Assert that the returned array of posts is empty and pagination data is
 *    valid.
 * 5. Ensure no errors are thrown and response conforms strictly to the
 *    IPageIDiscussionBoardPost DTO.
 */
export async function test_api_discussionBoard_test_list_posts_in_thread_no_posts(
  connection: api.IConnection,
) {
  // 1. Create a topic (as parent for the thread)
  const parentTopic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphaNumeric(12),
        description: RandomGenerator.paragraph()(),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(parentTopic);

  // 2. Create a thread under the topic (no posts)
  const newThread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: parentTopic.id,
        body: {
          title: RandomGenerator.alphaNumeric(10),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(newThread);

  // 3. List posts in this thread (should return empty array)
  const result =
    await api.functional.discussionBoard.member.threads.posts.index(
      connection,
      {
        threadId: newThread.id,
      },
    );
  typia.assert(result);

  // 4. Assert that returned data is an empty array
  TestValidator.equals("no posts in new thread")(result.data)([]);
  // Validate pagination: records=0, pages=1, current=1
  TestValidator.equals("pagination: records")(result.pagination.records)(0);
  TestValidator.equals("pagination: pages")(result.pagination.pages)(1);
  TestValidator.equals("pagination: current page")(result.pagination.current)(
    1,
  );
  // (Optional) Default limit check (implementation may auto-set this)
  TestValidator.predicate("pagination: limit>0")(result.pagination.limit > 0);
}
