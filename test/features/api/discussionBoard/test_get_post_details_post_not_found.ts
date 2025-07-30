import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Test proper error handling when attempting to fetch a non-existent post ID in
 * an existing thread.
 *
 * Business Context:
 *
 * - Ensures the discussion board API returns a not-found error for invalid post
 *   IDs (404) instead of leaking information or returning incorrect results.
 * - Verifies that an existing thread context is established, but the specified
 *   post does not exist in that thread.
 *
 * Test Steps:
 *
 * 1. Create a topic under a new (random) category.
 * 2. Create a thread under the created topic.
 * 3. Attempt to fetch a post using a valid thread ID but a random, non-existent
 *    post ID.
 * 4. Confirm that the response is a 404 error (post not found).
 */
export async function test_api_discussionBoard_test_get_post_details_post_not_found(
  connection: api.IConnection,
) {
  // 1. Create a new discussion topic under a random category (simulate category UUID)
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        description: RandomGenerator.paragraph()(2),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(topic);

  // 2. Create a thread under the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: { title: RandomGenerator.paragraph()(2) },
      },
    );
  typia.assert(thread);

  // 3. Attempt to fetch a post with a random (non-existent) post ID in the new thread
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should return 404 for not found post")(() =>
    api.functional.discussionBoard.member.threads.posts.at(connection, {
      threadId: thread.id,
      postId: nonExistentPostId,
    }),
  );
}
