import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validates creation of a threaded/nested comment with parent linkage in a discussion board post.
 *
 * This test exercises the following workflow:
 * 1. Create a discussion thread with required metadata.
 * 2. Create a post under the above thread.
 * 3. Create a root comment (no parent) on the post.
 * 4. Create a child comment specifying the parent's ID, thus nesting the comment.
 * 5. Validate linkage: child comment.parent_id matches root comment.id; both have correct post linkage.
 * 6. Assert audit fields and business behavior.
 */
export async function test_api_discussionBoard_test_create_nested_comment_with_parent_reference(connection: api.IConnection) {
  // 1. Create a discussion thread
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: typia.random<string & tags.Format<"uuid">>(),
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: `Thread for nesting test (${RandomGenerator.alphaNumeric(8)})`,
      body: RandomGenerator.paragraph()(),
    } satisfies IDiscussionBoardThread.ICreate
  });
  typia.assert(thread);

  // 2. Create a post in this thread
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: thread.discussion_board_member_id, // Use same author for testing
      body: RandomGenerator.paragraph()(),
    } satisfies IDiscussionBoardPost.ICreate
  });
  typia.assert(post);

  // 3. Create a root comment
  const rootComment = await api.functional.discussionBoard.comments.post(connection, {
    body: {
      discussion_board_post_id: post.id,
      body: "Root comment for nesting test",
      // parent_id omitted (defaults to null per DTO)
    } satisfies IDiscussionBoardComment.ICreate
  });
  typia.assert(rootComment);
  TestValidator.equals("comment is root")(rootComment.parent_id)(null);
  TestValidator.equals("comment attached to post")(rootComment.discussion_board_post_id)(post.id);
  TestValidator.equals("member for comment matches post")(rootComment.discussion_board_member_id)(post.discussion_board_member_id);

  // 4. Create a child comment with parent_id = rootComment.id
  const childComment = await api.functional.discussionBoard.comments.post(connection, {
    body: {
      discussion_board_post_id: post.id,
      parent_id: rootComment.id,
      body: "Threaded reply for parent linkage test",
    } satisfies IDiscussionBoardComment.ICreate
  });
  typia.assert(childComment);
  TestValidator.equals("child links to root parent")(childComment.parent_id)(rootComment.id);
  TestValidator.equals("child attached to same post")(childComment.discussion_board_post_id)(post.id);

  // 5. Audit: Timestamps and edit flags
  TestValidator.predicate("root created_at valid")(
    !!rootComment.created_at && typeof rootComment.created_at === "string"
  );
  TestValidator.predicate("child created_at valid")(
    !!childComment.created_at && typeof childComment.created_at === "string"
  );
  TestValidator.equals("parent is_edited false")(rootComment.is_edited)(false);
  TestValidator.equals("child is_edited false")(childComment.is_edited)(false);
}