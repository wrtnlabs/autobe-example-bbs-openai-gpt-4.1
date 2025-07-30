import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate that posts in member-only/restricted threads are protected from
 * unauthorized access.
 *
 * This test ensures that when a post is created in a member-only (restricted)
 * thread, attempts by an unauthorized user (guest/anonymous) to access the
 * post's detail will be blocked by the API, enforcing privacy and access
 * control.
 *
 * Steps:
 *
 * 1. Member creates a topic (simulating member-only access).
 * 2. Member creates a thread in this topic.
 * 3. Member creates a post in this thread.
 * 4. Simulate an unauthorized/guest request attempting to read the post detail.
 *
 *    - API call should fail with an error (not permitted for guests).
 * 5. Assert that error is thrown by the access control enforcement.
 *
 * This validates that content in restricted sections is not leaked to
 * non-members.
 */
export async function test_api_discussionBoard_test_get_post_details_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Member creates a topic
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphaNumeric(12),
        description: RandomGenerator.paragraph()(1),
        pinned: false,
        closed: false,
        discussion_board_category_id: categoryId,
      },
    },
  );
  typia.assert(topic);

  // 2. Member creates a thread in this topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: RandomGenerator.alphaNumeric(16),
        },
      },
    );
  typia.assert(thread);

  // 3. Member creates a post in this thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: RandomGenerator.content()()(),
      },
    },
  );
  typia.assert(post);

  // 4. Simulate unauthorized/guest user by removing Authorization from connection headers
  const guestConnection: api.IConnection = (() => {
    const { Authorization, ...headers } = connection.headers ?? {};
    return { ...connection, headers };
  })();
  await TestValidator.error("unauthorized access to restricted post must fail")(
    async () => {
      await api.functional.discussionBoard.member.threads.posts.at(
        guestConnection,
        {
          threadId: thread.id,
          postId: post.id,
        },
      );
    },
  );
}
