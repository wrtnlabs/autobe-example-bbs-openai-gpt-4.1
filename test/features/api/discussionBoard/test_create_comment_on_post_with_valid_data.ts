import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test creating a new comment on a post with valid data in the discussion board.
 *
 * This test validates the end-to-end process where a member submits a comment
 * on a post within a thread. It ensures that the comment is correctly stored,
 * links to the proper author, post, and relevant thread, and that all returned fields
 * are accurate. This is essential for content reliability and traceability in discussion boards.
 *
 * Steps:
 * 1. Generate a member id and category id to simulate the authenticated member context
 * 2. Create a thread (linked to member and category)
 * 3. Create a post (in that thread, by the same member)
 * 4. Create a comment (for that post, with valid body)
 * 5. Assert the comment's fields: linkage to author and post, text, untouched editable state, and timestamps
 */
export async function test_api_discussionBoard_test_create_comment_on_post_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Prepare a member id and a category id (simulate authenticated user context)
  const discussion_board_member_id: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
  const discussion_board_category_id: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();

  // 2. Create a thread (member initiates a thread in a category)
  const threadInput: IDiscussionBoardThread.ICreate = {
    discussion_board_member_id,
    discussion_board_category_id,
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()(1)(1),
  };
  const thread = await api.functional.discussionBoard.threads.post(connection, { body: threadInput });
  typia.assert(thread);

  // 3. Create a post in the thread by the same member
  const postInput: IDiscussionBoardPost.ICreate = {
    discussion_board_thread_id: thread.id,
    discussion_board_member_id,
    body: RandomGenerator.content()(1)(1),
  };
  const post = await api.functional.discussionBoard.posts.post(connection, { body: postInput });
  typia.assert(post);

  // 4. Create a comment on the post with valid body (no nesting/parent)
  const commentInput: IDiscussionBoardComment.ICreate = {
    discussion_board_post_id: post.id,
    body: RandomGenerator.content()(1)(1),
  };
  const comment = await api.functional.discussionBoard.comments.post(connection, { body: commentInput });
  typia.assert(comment);

  // 5. Validate comment's linkage and content
  TestValidator.equals("comment attached to correct post")(comment.discussion_board_post_id)(post.id);
  TestValidator.equals("comment authored by correct member")(comment.discussion_board_member_id)(discussion_board_member_id);
  TestValidator.equals("comment body correct")(comment.body)(commentInput.body);
  TestValidator.equals("comment is not edited")(comment.is_edited)(false);
  TestValidator.predicate("comment has creation timestamp")(!!comment.created_at);
  TestValidator.predicate("comment has update timestamp")(!!comment.updated_at);
  TestValidator.predicate("comment parent_id is null or undefined")(!comment.parent_id);
}