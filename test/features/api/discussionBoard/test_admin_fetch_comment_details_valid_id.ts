import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTopics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopics";
import type { IDiscussionBoardThreads } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreads";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate that an admin can retrieve complete details for a discussion board
 * comment via its unique commentId.
 *
 * This test covers a full data setup and retrieval workflow:
 *
 * 1. Register a test discussion board member as the comment author.
 * 2. Create a discussion topic for thread context.
 * 3. Create a thread in the topic.
 * 4. Add a post in the thread.
 * 5. Add a comment to the post (by the test member), and capture its UUID.
 * 6. As admin, fetch the comment details by commentId and validate:
 *
 *    - All persisted schema fields: id, discussion_board_member_id,
 *         discussion_board_post_id, content, is_deleted, created_at,
 *         updated_at
 *    - Field values match those set on creation
 *    - Is_deleted is false upon creation
 *    - There is no sensitive or extraneous data in response (checked via schema
 *         validation)
 * 7. Negative: attempt to fetch by an invalid/unknown UUID; expect error.
 */
export async function test_api_discussionBoard_test_admin_fetch_comment_details_valid_id(
  connection: api.IConnection,
) {
  // 1. Register a test board member (admin privilege)
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphaNumeric(12),
    joined_at: new Date().toISOString(),
  };
  const author = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberInput },
  );
  typia.assert(author);

  // 2. Create a topic for context (assign a random UUID category for required relation)
  const topicInput: IDiscussionBoardTopics.ICreate = {
    title: RandomGenerator.alphaNumeric(16),
    description: RandomGenerator.paragraph()(),
    pinned: false,
    closed: false,
    discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const topic = await api.functional.discussionBoard.member.topics.create(
    connection,
    { body: topicInput },
  );
  typia.assert(topic);

  // 3. Create a thread in the topic
  const threadInput: IDiscussionBoardThreads.ICreate = {
    title: RandomGenerator.alphabets(10),
  };
  const thread =
    await api.functional.discussionBoard.member.topics.threads.create(
      connection,
      { topicId: topic.id, body: threadInput },
    );
  typia.assert(thread);

  // 4. Add a post in the thread
  const postInput: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: thread.id,
    body: RandomGenerator.paragraph()(),
  };
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    { threadId: thread.id, body: postInput },
  );
  typia.assert(post);

  // 5. Add a comment to the post by the member
  const commentInput: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: author.id,
    discussion_board_post_id: post.id,
    content: RandomGenerator.paragraph()(),
  };
  const createdComment =
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: commentInput,
    });
  typia.assert(createdComment);

  // 6. As admin, fetch comment by id and validate all schema fields
  const fetchedComment = await api.functional.discussionBoard.admin.comments.at(
    connection,
    { commentId: createdComment.id },
  );
  typia.assert(fetchedComment);
  TestValidator.equals("comment id matches")(fetchedComment.id)(
    createdComment.id,
  );
  TestValidator.equals("member ref matches")(
    fetchedComment.discussion_board_member_id,
  )(createdComment.discussion_board_member_id);
  TestValidator.equals("post ref matches")(
    fetchedComment.discussion_board_post_id,
  )(createdComment.discussion_board_post_id);
  TestValidator.equals("content matches")(fetchedComment.content)(
    createdComment.content,
  );
  TestValidator.equals("is_deleted is false")(fetchedComment.is_deleted)(false);
  TestValidator.predicate("should have created_at timestamp")(
    !!fetchedComment.created_at,
  );
  TestValidator.predicate("should have updated_at timestamp")(
    !!fetchedComment.updated_at,
  );

  // 7. Negative: Fetch using an invalid/unknown UUID; expect error
  await TestValidator.error("invalid uuid fails")(() =>
    api.functional.discussionBoard.admin.comments.at(connection, {
      commentId: "00000000-0000-0000-0000-000000000001" as string &
        tags.Format<"uuid">,
    }),
  );
}
