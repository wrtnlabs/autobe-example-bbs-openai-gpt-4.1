import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IPageIDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * End-to-end test: Public access to comment list for thread post.
 *
 * Verifies that any user (whether authenticated or not) can fetch a
 * paginated, filtered list of comments for a specific post within a thread,
 * and that the returned data only includes non-soft-deleted comments, with
 * correct nesting structure (parent_id, nesting_level), paging, search, and
 * filtering logic.
 *
 * Steps:
 *
 * 1. List threads – Find a public, unlocked, non-archived thread (first page).
 * 2. List posts – Fetch the first post in this thread (first page).
 * 3. List comments for the chosen post (first page, default filter – no auth).
 * 4. Check that only non-soft-deleted comments (deleted_at null) are present.
 * 5. Assert that top-level comments have parent_id null and nesting_level 0,
 *    and that replies/ref-level comments have correct parent and nesting
 *    logic.
 * 6. If comments fill more than one page, fetch page 2 to test pagination and
 *    assertions repeat.
 * 7. Search comments by keyword (body substring), validate results.
 * 8. Filter comments by author_id and assert correctness.
 */
export async function test_api_comment_list_public_access_by_thread_and_post(
  connection: api.IConnection,
) {
  // 1. List public, unlocked, non-archived threads
  const threads = await api.functional.discussionBoard.threads.index(
    connection,
    {
      body: {
        is_locked: false,
        is_archived: false,
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardThread.IRequest,
    },
  );
  typia.assert(threads);
  TestValidator.predicate(
    "at least one public, unlocked thread",
    threads.data.length > 0,
  );
  TestValidator.equals("threads page 1", threads.pagination.current, 1);
  const thread = threads.data[0];

  // 2. List posts for the selected thread
  const posts = await api.functional.discussionBoard.threads.posts.index(
    connection,
    {
      threadId: thread.id,
      body: { limit: 10, page: 1 } satisfies IDiscussionBoardPost.IRequest,
    },
  );
  typia.assert(posts);
  TestValidator.predicate("at least one post in thread", posts.data.length > 0);
  TestValidator.equals("posts page 1", posts.pagination.current, 1);
  const post = posts.data[0];

  // 3. List comments for post (default filter, 1st page), public access
  const limit = 20;
  const commentsPage =
    await api.functional.discussionBoard.threads.posts.comments.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          limit,
          page: 1,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(commentsPage);
  TestValidator.equals("comments page 1", commentsPage.pagination.current, 1);
  TestValidator.predicate(
    "comments response contains data array",
    Array.isArray(commentsPage.data),
  );
  TestValidator.predicate(
    "comments page size within limit",
    commentsPage.data.length <= limit,
  );

  // 4. All returned comments: not soft-deleted
  commentsPage.data.forEach((comment, idx) => {
    TestValidator.equals(
      `comment[${idx}] not soft-deleted`,
      comment.deleted_at,
      null,
    );
    typia.assert(comment);
  });

  // 5. Check nesting/parent structure
  commentsPage.data.forEach((comment, idx) => {
    if (comment.parent_id === null || comment.parent_id === undefined) {
      TestValidator.equals(
        `comment[${idx}] top-level nesting`,
        comment.nesting_level,
        0,
      );
    } else {
      const parent = commentsPage.data.find((c) => c.id === comment.parent_id);
      if (parent) {
        TestValidator.equals(
          `comment[${idx}] reply nesting`,
          comment.nesting_level,
          parent.nesting_level + 1,
        );
      } // else parent not found (possibly off-page)
    }
  });

  // 6. Pagination: fetch and validate second page if more than one page exists
  if (commentsPage.pagination.pages > 1) {
    const commentsPage2 =
      await api.functional.discussionBoard.threads.posts.comments.index(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          body: {
            post_id: post.id,
            limit,
            page: 2,
          } satisfies IDiscussionBoardComment.IRequest,
        },
      );
    typia.assert(commentsPage2);
    TestValidator.equals(
      "comments pagination page 2",
      commentsPage2.pagination.current,
      2,
    );
    TestValidator.predicate(
      "comments page 2 size within limit",
      commentsPage2.data.length <= limit,
    );
    commentsPage2.data.forEach((comment, idx) => {
      TestValidator.equals(
        `comment2[${idx}] not soft-deleted`,
        comment.deleted_at,
        null,
      );
      typia.assert(comment);
    });
  }

  // 7. Search by keyword (body substring)
  if (commentsPage.data.length > 0) {
    const keyword = commentsPage.data[0].body.substring(
      0,
      Math.min(5, commentsPage.data[0].body.length),
    );
    if (keyword) {
      const searchPage =
        await api.functional.discussionBoard.threads.posts.comments.index(
          connection,
          {
            threadId: thread.id,
            postId: post.id,
            body: {
              post_id: post.id,
              search: keyword,
              limit,
              page: 1,
            } satisfies IDiscussionBoardComment.IRequest,
          },
        );
      typia.assert(searchPage);
      searchPage.data.forEach((comment, idx) => {
        TestValidator.predicate(
          `comment[search][${idx}] body includes keyword`,
          comment.body.includes(keyword),
        );
      });
    }
  }

  // 8. Filter by author_id
  if (commentsPage.data.length > 0) {
    const authorId = commentsPage.data[0].created_by_id;
    const byAuthorPage =
      await api.functional.discussionBoard.threads.posts.comments.index(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          body: {
            post_id: post.id,
            author_id: authorId,
            limit,
            page: 1,
          } satisfies IDiscussionBoardComment.IRequest,
        },
      );
    typia.assert(byAuthorPage);
    byAuthorPage.data.forEach((comment, idx) => {
      TestValidator.equals(
        `comment[author][${idx}] by correct author`,
        comment.created_by_id,
        authorId,
      );
    });
  }
}
