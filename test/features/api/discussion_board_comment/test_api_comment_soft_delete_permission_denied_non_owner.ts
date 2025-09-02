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

/**
 * Verify that non-owners cannot delete comments (permission denied on
 * DELETE).
 *
 * This test ensures only the comment creator (owner) can delete their own
 * comment. It validates that deletion by another user fails with a
 * permission error.
 *
 * Scenario steps:
 *
 * 1. Register user A (who will create thread, post, and comment)
 * 2. As user A: create a thread
 * 3. As user A: add a post to that thread
 * 4. As user A: add a comment to that post
 * 5. Register user B (automatically switches authentication context)
 * 6. As user B: attempt to delete user A's comment using the comment's ID
 * 7. Assert that an error is thrown—permission denied (expected: 403
 *    Forbidden)
 *
 * This test guarantees API enforces ownership-based delete protection for
 * comments.
 */
export async function test_api_comment_soft_delete_permission_denied_non_owner(
  connection: api.IConnection,
) {
  // 1. Register user A (comment owner and post/thread author)
  const emailA = typia.random<string & tags.Format<"email">>();
  const usernameA =
    RandomGenerator.name(1) + Math.floor(Math.random() * 100000).toString();
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: emailA,
      username: usernameA,
      password: "StrongTest123!",
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userA);

  // 2. User A creates a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. User A creates a post in the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. User A creates a comment under the post
  const comment =
    await api.functional.discussionBoard.user.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. Register user B (authentication context is now user B)
  const emailB = typia.random<string & tags.Format<"email">>();
  const usernameB =
    RandomGenerator.name(1) + Math.floor(Math.random() * 100000).toString();
  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: emailB,
      username: usernameB,
      password: "TestOther456$",
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userB);

  // 6. As user B, attempt to delete user A's comment
  await TestValidator.error(
    "permission denied: non-owner cannot soft-delete comment",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.comments.erase(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
}
