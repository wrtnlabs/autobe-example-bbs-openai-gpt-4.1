import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Verify that guests (unauthenticated users) cannot create posts in discussion
 * threads.
 *
 * This test ensures that only authenticated members can post in threads. It
 * simulates the following steps:
 *
 * 1. Create a new topic as a (simulated) member.
 * 2. Create a new thread within that topic.
 * 3. Attempt to create a post in the thread as a guest (unauthenticated
 *    connection).
 * 4. Confirm that the API returns an authentication or permission-denied error and
 *    does not create the post.
 *
 * As there is no post list/retrieval endpoint to confirm absence, the test
 * relies on the expected error and guarantees no guest post creation is allowed
 * by business logic.
 */
export async function test_api_discussionBoard_test_create_post_in_thread_as_guest_forbidden(
  connection: api.IConnection,
) {
  // 1. Create a topic as member
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        // Use random realistic topic details
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.paragraph()(2),
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardTopics.ICreate,
    },
  );
  typia.assert(topic);

  // 2. Create a thread under the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.paragraph()(1),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 3. Attempt to create a post in the thread as a guest (unauthenticated)
  // (Assume that the provided connection does not have member tokens, or explicitly clean headers if possible)
  TestValidator.error("posting as guest must fail")(async () => {
    await api.functional.discussionBoard.member.threads.posts.create(
      connection,
      {
        threadId: thread.id,
        body: {
          discussion_board_thread_id: thread.id,
          body: RandomGenerator.paragraph()(1),
        } satisfies IDiscussionBoardPost.ICreate,
      },
    );
  });
}
