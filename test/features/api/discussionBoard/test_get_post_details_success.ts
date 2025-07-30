import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate retrieval of a discussion board post's details by a member.
 *
 * This test verifies that after creating a topic, a thread under it, and a post
 * within the thread, a member can fetch the full details of that post using its
 * ID in the context of the thread. The test ensures:
 *
 * 1. All relevant fields (id, thread, body, creator, timestamps, etc.) are
 *    correctly present and aligned.
 * 2. The contents (body and associations) match what was created.
 * 3. The deleted_at field is null/undefined reflecting an active post.
 * 4. Access permission logic is as expected for a normal member (successful
 *    retrieval).
 *
 * Test Steps:
 *
 * 1. Create a topic.
 * 2. Create a thread under the topic.
 * 3. Create a post inside that thread.
 * 4. Retrieve the post details by threadId and postId.
 * 5. Validate all required and returned fields.
 */
export async function test_api_discussionBoard_test_get_post_details_success(
  connection: api.IConnection,
) {
  // 1. Create a topic
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
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
        body: {
          title: RandomGenerator.paragraph()(),
        },
      },
    );
  typia.assert(thread);

  // 3. Create a post inside the thread
  const postBody = RandomGenerator.content()()();
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        discussion_board_thread_id: thread.id,
        body: postBody,
      },
    },
  );
  typia.assert(post);

  // 4. Retrieve the post details by threadId and postId
  const read = await api.functional.discussionBoard.member.threads.posts.at(
    connection,
    {
      threadId: thread.id,
      postId: post.id,
    },
  );
  typia.assert(read);

  // 5. Validate fields and business logic
  TestValidator.equals("id matches")(read.id)(post.id);
  TestValidator.equals("thread id matches")(read.discussion_board_thread_id)(
    thread.id,
  );
  TestValidator.equals("body matches")(read.body)(postBody);
  TestValidator.equals("creator matches")(read.creator_member_id)(
    post.creator_member_id,
  );
  TestValidator.equals("is_edited is false for new post")(read.is_edited)(
    false,
  );
  TestValidator.predicate("created_at present")(
    typeof read.created_at === "string" && read.created_at.length > 0,
  );
  TestValidator.predicate("updated_at present")(
    typeof read.updated_at === "string" && read.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null or undefined for active post")(
    read.deleted_at === null || typeof read.deleted_at === "undefined",
  )(true);
}
