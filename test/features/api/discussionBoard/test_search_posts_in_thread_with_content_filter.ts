import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";

/**
 * Validate full-text search/filtering for posts in a thread by content
 * keywords.
 *
 * Scenario: A member creates a new topic, then a thread under it, and finally
 * multiple posts with varying content within that thread. The member then
 * searches for posts using a specific substring known to appear in the body of
 * some (but not all) posts, and verifies that only posts containing that
 * substring in their body are returned. This ensures the server-side text
 * search capability works as required and no posts lacking the substring are
 * returned. The test also checks that all posts which should be present for the
 * given search keyword appear in the result set, with correct data integrity
 * for their content and relationships (thread ID, ordering).
 *
 * Steps:
 *
 * 1. Create a topic with a unique title.
 * 2. Create a thread in that topic.
 * 3. Insert multiple posts to the thread with varying content, some of which
 *    contain a test phrase/keyword.
 * 4. Use the "bodySubstring" filter in the patch/search endpoint to find posts
 *    containing that keyword.
 * 5. Assert that the returned posts all contain the substring and that only the
 *    appropriate posts are returned.
 * 6. Assert on negative search that no posts are returned when the substring is
 *    absent.
 */
export async function test_api_discussionBoard_test_search_posts_in_thread_with_content_filter(
  connection: api.IConnection,
) {
  // 1. Create a topic
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: `Search Test Topic ${Date.now()}`,
        description: "A topic for testing post content filter.",
        pinned: false,
        closed: false,
        discussion_board_category_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(topic);

  // 2. Create a thread in the topic
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      {
        topicId: topic.id,
        body: {
          title: `Content Filter Thread ${Date.now()}`,
        },
      },
    );
  typia.assert(thread);

  // 3. Insert multiple posts (some with, some without the test keyword)
  const KEYWORD = "magickeyword";
  const otherText = [
    "This post does not include it.",
    "Just some unrelated text.",
    "A different sentence altogether.",
  ];
  const matchingPosts = [
    `This is the first post containing ${KEYWORD}.`,
    `Another post with ${KEYWORD} right here!`,
    `Here we talk about ${KEYWORD} in detail.`,
  ];
  // Interleave matching/non-matching posts for realistic test coverage
  const allBodies: string[] = [
    matchingPosts[0],
    otherText[0],
    matchingPosts[1],
    otherText[1],
    matchingPosts[2],
    otherText[2],
  ];
  const createdPosts: IDiscussionBoardPost[] = [];
  const expectedIds: string[] = [];
  for (const body of allBodies) {
    const post =
      await api.functional.discussionBoard.member.threads.posts.create(
        connection,
        {
          threadId: thread.id,
          body: {
            discussion_board_thread_id: thread.id,
            body,
          },
        },
      );
    typia.assert(post);
    createdPosts.push(post);
    if (body.includes(KEYWORD)) expectedIds.push(post.id);
  }

  // 4. Search for posts containing the keyword
  const page = await api.functional.discussionBoard.member.threads.posts.search(
    connection,
    {
      threadId: thread.id,
      body: {
        threadId: thread.id,
        bodySubstring: KEYWORD,
        pagination: { limit: 10 },
      },
    },
  );
  typia.assert(page);

  // 5. Assert that the returned posts all contain the substring and only matching posts are returned
  const foundIds = page.data.map((p) => p.id);
  TestValidator.equals("all posts found and only matches")(
    [...foundIds].sort(),
  )([...expectedIds].sort());
  for (const post of page.data) {
    TestValidator.predicate("body contains keyword")(
      post.body.includes(KEYWORD),
    );
    TestValidator.equals("thread id matches")(post.discussion_board_thread_id)(
      thread.id,
    );
  }

  // 6. Negative control: search with a substring that matches no posts
  const pageNoMatch =
    await api.functional.discussionBoard.member.threads.posts.search(
      connection,
      {
        threadId: thread.id,
        body: {
          threadId: thread.id,
          bodySubstring: "notfoundphrase",
          pagination: { limit: 10 },
        },
      },
    );
  typia.assert(pageNoMatch);
  TestValidator.equals("no matches for nonsense phrase")(
    pageNoMatch.data.length,
  )(0);
}
