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
 * Tests that a member can retrieve a paginated list of all current
 * (non-deleted) posts in a thread and that posts created by different members
 * are visible (if not soft-deleted). It also verifies proper pagination, the
 * correct sorting order, and that the result is accessible to the authenticated
 * member.
 *
 * Steps:
 *
 * 1. Create a topic, as a prerequisite for creating a thread.
 * 2. Create a thread under that topic.
 * 3. Create several posts under the thread (all as same member, as multi-member
 *    session switching is not available here).
 * 4. Fetch the paginated list of posts for the thread.
 * 5. Verify:
 *
 *    - All non-deleted posts are present.
 *    - Posts are sorted by creation date ascending.
 *    - Pagination metadata and counts are accurate.
 *    - Each post entity contains expected fields and references.
 */
export async function test_api_discussionBoard_test_list_posts_in_thread_success(
  connection: api.IConnection,
) {
  // 1. Create a topic to enable thread creation (using random valid values)
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphaNumeric(16),
        description: RandomGenerator.alphaNumeric(24),
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
          title: RandomGenerator.alphaNumeric(16),
        } satisfies IDiscussionBoardThreads.ICreate,
      },
    );
  typia.assert(thread);

  // 3. Create several posts under the thread
  const postBodies = [
    "First post from member",
    "Second post from member",
    "Third post from member",
    "Fourth post from member",
    "Fifth post from member",
  ];
  const posts = [];
  for (const body of postBodies) {
    const post =
      await api.functional.discussionBoard.member.threads.posts.create(
        connection,
        {
          threadId: thread.id,
          body: {
            discussion_board_thread_id: thread.id,
            body,
          } satisfies IDiscussionBoardPost.ICreate,
        },
      );
    typia.assert(post);
    posts.push(post);
  }

  // 4. Retrieve the paginated list of posts for the thread
  const page = await api.functional.discussionBoard.member.threads.posts.index(
    connection,
    {
      threadId: thread.id,
    },
  );
  typia.assert(page);

  // 5. Assertions
  // Check number of returned posts matches what was created
  TestValidator.equals("Total records equal posts created")(
    page.pagination.records,
  )(posts.length);
  TestValidator.equals("Posts count in data")(page.data.length)(posts.length);

  // Check each post content and order (should be sorted by created_at ascending)
  const sortedPosts = [...posts].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  for (let i = 0; i < posts.length; ++i) {
    TestValidator.equals(`Post ${i} id matches order`)(page.data[i].id)(
      sortedPosts[i].id,
    );
    TestValidator.equals(`Post ${i} content matches`)(page.data[i].body)(
      sortedPosts[i].body,
    );
    TestValidator.equals(`Post ${i} thread ref`)(
      page.data[i].discussion_board_thread_id,
    )(thread.id);
    TestValidator.equals(`Post ${i} is not deleted`)(page.data[i].deleted_at)(
      null,
    );
  }

  // Check each returned post's thread reference and non-deleted status
  for (const post of page.data) {
    TestValidator.equals("Thread ref matches")(post.discussion_board_thread_id)(
      thread.id,
    );
    TestValidator.equals("Not deleted")(post.deleted_at)(null);
  }
}
