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
 * Validate that a discussion board user cannot delete another user's reply
 * (authorization enforcement on reply deletion).
 *
 * This test ensures that reply ownership is enforced during deletion: only
 * the author (or moderator, admin – not covered here) can delete their
 * reply. Non-authors (even authenticated) must not be allowed to delete
 * replies authored by other users under the thread/post/comment structure.
 *
 * Business workflow:
 *
 * 1. Register user1 (the reply author) and authenticate as user1.
 * 2. User1 creates a thread.
 * 3. User1 creates a post in the thread.
 * 4. User1 creates a comment in the post.
 * 5. User1 creates a reply under that comment.
 * 6. Register user2 (a different user) and switch authentication to user2.
 * 7. As user2, attempt to delete the reply authored by user1. Assert that a
 *    forbidden error is thrown.
 * 8. (Note: Verifying reply existence after failed delete is not implemented;
 *    no API is available to re-fetch a specific reply.)
 */
export async function test_api_reply_delete_forbidden_for_non_author(
  connection: api.IConnection,
) {
  // 1. Register user1 and authenticate
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Username = RandomGenerator.name();
  const user1Password = "ValidPassw0rd!";
  await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Username,
      password: user1Password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });

  // 2. User1 creates a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.name(3),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. User1 creates a post in the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.name(2),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 2,
          sentenceMax: 4,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. User1 creates a comment under the post
  const comment =
    await api.functional.discussionBoard.user.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. User1 creates a reply under the comment
  const reply =
    await api.functional.discussionBoard.user.threads.posts.comments.replies.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: comment.id,
        body: {
          post_id: post.id,
          parent_id: comment.id,
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(reply);

  // 6. Register user2 and switch authentication context to user2
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.name();
  const user2Password = "ValidPassw0rd!";
  await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Username,
      password: user2Password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });

  // 7. As user2, attempt to delete user1's reply, and validate forbidden error is thrown
  await TestValidator.error(
    "forbid non-author from deleting another user's reply",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.comments.replies.erase(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: comment.id,
          replyId: reply.id,
        },
      );
    },
  );
  // 8. Verification of reply state after failed deletion is not possible with current API (no 'get reply' function exposed)
}
