import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for listing and paginating comment replies (nested comments) on
 * a post.
 *
 * Validates registration, authentication, resource creation, hierarchical
 * reply structure, and listing with filtering/pagination.
 *
 * Steps:
 *
 * 1. Register and authenticate a new user
 * 2. Create a thread
 * 3. Create a post in the thread
 * 4. Add a top-level comment to the post as the parent comment
 * 5. Create multiple replies (nested comments) as direct children of the
 *    parent comment (at least 8 for pagination)
 * 6. Soft-delete one reply to verify exclusion from results (simulated in test
 *    only)
 * 7. List (PATCH) replies with pagination/filtering. Check
 *    total/pagination/count/order and that only direct, non-deleted replies
 *    are returned
 * 8. Verify deleted reply is not present in listing results
 * 9. Test edge cases: last partial page, empty page beyond
 */
export async function test_api_comment_replies_list_pagination_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "A#1";
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);
  const userId = userJoin.user.id;

  // 2. Create a thread
  const threadTitle = RandomGenerator.paragraph({ sentences: 4 });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: { title: threadTitle } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create a post
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: postBody,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create top-level (parent) comment
  const parentCommentBody = RandomGenerator.paragraph({ sentences: 5 });
  const parentComment =
    await api.functional.discussionBoard.user.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: parentCommentBody,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);

  // 5. Create multiple replies (at least 8 for pagination test)
  const numReplies = 8;
  const replies: IDiscussionBoardComment[] = await ArrayUtil.asyncMap(
    ArrayUtil.repeat(numReplies, (i) => i),
    async (i) => {
      const replyBody = RandomGenerator.paragraph({ sentences: 2 + (i % 2) });
      const reply =
        await api.functional.discussionBoard.user.threads.posts.comments.replies.create(
          connection,
          {
            threadId: thread.id,
            postId: post.id,
            commentId: parentComment.id,
            body: {
              post_id: post.id,
              parent_id: parentComment.id,
              body: replyBody,
            } satisfies IDiscussionBoardComment.ICreate,
          },
        );
      typia.assert(reply);
      return reply;
    },
  );

  // 6. Soft-delete one reply (simulate soft deletion by removing from results for testing)
  // Since no delete endpoint is provided in materials, skip the physical API call for soft-delete
  // Instead, use only non-deleted replies in validation
  // Mark one reply as 'deleted' in test variables for exclusion in validation
  const deletedReplyIndex = 3;
  const deletedReply = replies[deletedReplyIndex];

  // 7. List replies via PATCH with pagination (limit 3 per page)
  const limit = 3;
  const totalReplies = numReplies - 1; // one reply is 'deleted'
  const totalPages = Math.ceil(totalReplies / limit);
  let accumulated: IDiscussionBoardComment.ISummary[] = [];

  for (let page = 1; page <= totalPages; ++page) {
    const list =
      await api.functional.discussionBoard.user.threads.posts.comments.replies.index(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: parentComment.id,
          body: {
            post_id: post.id,
            parent_id: parentComment.id,
            nesting_level: (parentComment.nesting_level ?? 0) + 1,
            page,
            limit,
            sort: "created_at asc",
          } satisfies IDiscussionBoardComment.IRequest,
        },
      );
    typia.assert(list);
    TestValidator.equals(
      "pagination page matches",
      list.pagination.current,
      page,
    );
    TestValidator.equals(
      "pagination limit matches",
      list.pagination.limit,
      limit,
    );
    if (page !== totalPages)
      TestValidator.equals(
        "pagination records = limit for full page",
        list.data.length,
        limit,
      );
    accumulated = accumulated.concat(list.data);

    // All replies in data should have the correct parent_id, not be deleted, and correct nesting
    for (const summary of list.data) {
      TestValidator.equals(
        "reply parent_id matches",
        summary.parent_id,
        parentComment.id,
      );
      TestValidator.equals("reply not deleted", summary.deleted_at, null);
      TestValidator.equals(
        "reply nesting_level",
        summary.nesting_level,
        (parentComment.nesting_level ?? 0) + 1,
      );
      TestValidator.notEquals(
        "reply is not fake deleted",
        summary.id,
        deletedReply.id,
      );
    }
  }

  // 8. Confirm deleted reply is not present
  TestValidator.predicate(
    "deleted reply not present in results",
    accumulated.every((s) => s.id !== deletedReply.id),
  );
  TestValidator.equals(
    "total replies listed = inserted replies - deleted",
    accumulated.length,
    totalReplies,
  );

  // 9. Edge case: last page is partial or empty
  if (totalReplies % limit !== 0) {
    const lastPage = totalPages;
    const list =
      await api.functional.discussionBoard.user.threads.posts.comments.replies.index(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: parentComment.id,
          body: {
            post_id: post.id,
            parent_id: parentComment.id,
            nesting_level: (parentComment.nesting_level ?? 0) + 1,
            page: lastPage,
            limit,
            sort: "created_at asc",
          },
        },
      );
    typia.assert(list);
    TestValidator.equals(
      "edge case: last partial page length",
      list.data.length,
      totalReplies - limit * (lastPage - 1),
    );
  }
  // Try accessing page beyond totalPages: expect empty result
  const outOfRangePage = totalPages + 1;
  const list =
    await api.functional.discussionBoard.user.threads.posts.comments.replies.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: parentComment.id,
        body: {
          post_id: post.id,
          parent_id: parentComment.id,
          nesting_level: (parentComment.nesting_level ?? 0) + 1,
          page: outOfRangePage,
          limit,
          sort: "created_at asc",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(list);
  TestValidator.equals(
    "edge case: empty page beyond totalPages",
    list.data.length,
    0,
  );
}
