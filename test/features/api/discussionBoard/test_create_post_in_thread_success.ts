import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * E2E test: Authenticated member creates a new post in a thread.
 *
 * This test verifies the successful workflow for a standard member:
 *
 * 1. Create a topic to serve as the parent context (because a thread needs a
 *    topic)
 * 2. Create a thread within that topic
 * 3. Create a post inside the thread as the authenticated member
 * 4. Validate the returned post's associations and core fields
 * 5. (Optional step omitted: re-retrieving the thread/post-list for verification,
 *    since corresponding API is not exposed)
 *
 * By chaining these dependencies, we validate the full user workflow from topic
 * → thread → post using only valid data and confirming output fields. Type and
 * business field validation is performed at each step.
 */
export async function test_api_discussionBoard_test_create_post_in_thread_success(
  connection: api.IConnection,
) {
  // 1. Create a topic
  const topicInput: IDiscussionBoardTopics.ICreate = {
    title: RandomGenerator.paragraph()(1),
    description: RandomGenerator.content()()(),
    pinned: false,
    closed: false,
    discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    { body: topicInput },
  );
  typia.assert(topic);
  TestValidator.equals("topic title")(topic.title)(topicInput.title);
  TestValidator.equals("topic closed flag")(topic.closed)(topicInput.closed);

  // 2. Create a thread within the topic
  const threadInput: IDiscussionBoardThreads.ICreate = {
    title: RandomGenerator.paragraph()(1),
  };
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      { topicId: topic.id, body: threadInput },
    );
  typia.assert(thread);
  TestValidator.equals("thread title")(thread.title)(threadInput.title);
  TestValidator.equals("thread topic association")(
    thread.discussion_board_topic_id,
  )(topic.id);

  // 3. Create a post in the thread
  const postInput: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: thread.id,
    body: RandomGenerator.content()()(),
  };
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    { threadId: thread.id, body: postInput },
  );
  typia.assert(post);
  TestValidator.equals("post thread linkage")(post.discussion_board_thread_id)(
    thread.id,
  );
  TestValidator.equals("post body")(post.body)(postInput.body);
  TestValidator.equals("post not edited")(post.is_edited)(false);
}
