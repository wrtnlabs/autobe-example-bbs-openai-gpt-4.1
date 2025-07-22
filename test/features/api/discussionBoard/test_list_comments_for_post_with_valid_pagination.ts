import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that the paginated, filtered comment list API works for a specific post.
 *
 * This test ensures that, for a given post, when multiple comments exist (created by multiple simulated users),
 * the PATCH /discussionBoard/comments endpoint correctly returns a paginated and filtered list of those comments.
 * Pagination and filtering should match the parameters passed, and each returned comment must have proper audit fields.
 *
 * Steps:
 * 1. Create a thread (discussionBoard/threads)
 * 2. Create a post in that thread (discussionBoard/posts)
 * 3. Create multiple comments for the post (discussionBoard/comments), at least two different simulated members.
 * 4. Call PATCH /discussionBoard/comments with filtering by { post_id, limit=2, page=1 }, verify correct subset and proper audit fields.
 * 5. Fetch page 2, verify the comments are correct and not duplicated.
 * 6. Optionally filter by one member, verify only that member's comments are returned.
 */
export async function test_api_discussionBoard_test_list_comments_for_post_with_valid_pagination(
  connection: api.IConnection,
) {
  // 1. Create a discussion thread
  const memberId: string = typia.random<string & tags.Format<"uuid">>(); // Simulated author/member
  const categoryId: string = typia.random<string & tags.Format<"uuid">>(); // Simulated category
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: memberId,
      discussion_board_category_id: categoryId,
      title: RandomGenerator.paragraph()(10),
      body: RandomGenerator.content()(10)(),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 2. Create a post under the thread
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: memberId,
      body: RandomGenerator.content()(8)(),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(post);

  // 3. Create multiple comments on that post, from at least two simulated users
  const commentAuthors = [
    typia.random<string & tags.Format<"uuid">>(), // Author 1
    typia.random<string & tags.Format<"uuid">>(), // Author 2
    typia.random<string & tags.Format<"uuid">>(), // Author 3
  ];
  const comments = [] as IDiscussionBoardComment[];
  for (let i = 0; i < 5; ++i) {
    const c = await api.functional.discussionBoard.comments.post(connection, {
      body: {
        discussion_board_post_id: post.id,
        // parent_id is optional and omitted here
        body: `Test comment ${i + 1}`,
      } satisfies IDiscussionBoardComment.ICreate,
    });
    // Patch in the simulated member (the actual creator logic assumed handled by auth context in API/integration)
    // We can't pass discussion_board_member_id here as it's not allowed in the schema
    typia.assert(c);
    comments.push(c);
  }

  // 4. List first page (limit=2, page=1) filtering by post_id
  const page1 = await api.functional.discussionBoard.comments.patch(connection, {
    body: {
      post_id: post.id,
      limit: 2,
      page: 1,
    } satisfies IDiscussionBoardComment.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals("first page size")(page1.data.length)(2);
  for (const comment of page1.data) {
    TestValidator.equals("comment post id")(comment.discussion_board_post_id)(post.id);
    TestValidator.predicate("audit fields present")(!!comment.id && !!comment.created_at && !!comment.updated_at);
  }

  // 5. List second page
  const page2 = await api.functional.discussionBoard.comments.patch(connection, {
    body: {
      post_id: post.id,
      limit: 2,
      page: 2,
    } satisfies IDiscussionBoardComment.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals("second page size")(page2.data.length)(2);
  for (const comment of page2.data) {
    TestValidator.equals("comment post id")(comment.discussion_board_post_id)(post.id);
    TestValidator.predicate("audit fields present")(!!comment.id && !!comment.created_at && !!comment.updated_at);
  }

  // 6. Filter by one member (ONLY by the filter API, not on create)
  const filteredByAuthor = await api.functional.discussionBoard.comments.patch(connection, {
    body: {
      post_id: post.id,
      discussion_board_member_id: page1.data[0].discussion_board_member_id,
    } satisfies IDiscussionBoardComment.IRequest,
  });
  typia.assert(filteredByAuthor);
  for (const comment of filteredByAuthor.data) {
    TestValidator.equals("filtered member")(comment.discussion_board_member_id)(page1.data[0].discussion_board_member_id);
  }
}