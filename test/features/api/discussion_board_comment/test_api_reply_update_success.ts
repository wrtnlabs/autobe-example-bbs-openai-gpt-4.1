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
 * E2E test: User successfully updates their own reply beneath a comment in
 * a thread post.
 *
 * Business context: Only authenticated users are allowed to perform content
 * updates on replies that they themselves authored. Before a reply can be
 * updated, a chain of entities must be created: user → thread → post →
 * comment → reply. This test covers the complete process, verifies
 * parent-child relationships, and checks post-update invariants.
 *
 * Steps:
 *
 * 1. Register and authenticate a new user.
 * 2. Create a new thread as this user.
 * 3. Add a post to the thread, authored by this user.
 * 4. Add a comment as the user to the post.
 * 5. Add a reply under that comment, authored by the user.
 * 6. Update the reply body content.
 * 7. Assert that the reply's body is changed, that updated_at has advanced,
 *    and all IDs are unchanged.
 */
export async function test_api_reply_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a user
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "!Aa1";
  const display_name = RandomGenerator.name();
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);
  TestValidator.equals(
    "authenticated user email matches",
    userAuth.user.email,
    email,
  );
  TestValidator.equals(
    "authenticated username matches",
    userAuth.user.username,
    username,
  );

  // 2. Create a thread
  const threadTitle = RandomGenerator.paragraph({ sentences: 3 });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: { title: threadTitle } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);
  TestValidator.equals("thread title matches", thread.title, threadTitle);
  TestValidator.equals(
    "thread creator matches user",
    thread.created_by_id,
    userAuth.user.id,
  );

  // 3. Add a post to the thread
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: postTitle,
        body: postBody,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals(
    "post thread_id matches thread",
    post.thread_id,
    thread.id,
  );
  TestValidator.equals(
    "post creator matches user",
    post.created_by_id,
    userAuth.user.id,
  );

  // 4. Add a comment to the post
  const commentBody = RandomGenerator.paragraph({ sentences: 5 });
  const comment =
    await api.functional.discussionBoard.user.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: commentBody,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals("comment body matches", comment.body, commentBody);
  TestValidator.equals(
    "comment post_id matches post",
    comment.post_id,
    post.id,
  );
  TestValidator.equals(
    "comment creator matches user",
    comment.created_by_id,
    userAuth.user.id,
  );

  // 5. Add a reply beneath the comment
  const replyBodyOriginal = RandomGenerator.paragraph({ sentences: 3 });
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
          body: replyBodyOriginal,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(reply);
  TestValidator.equals(
    "reply body matches original",
    reply.body,
    replyBodyOriginal,
  );
  TestValidator.equals(
    "reply parent_id matches comment",
    reply.parent_id,
    comment.id,
  );
  TestValidator.equals("reply post_id matches post", reply.post_id, post.id);
  TestValidator.equals(
    "reply creator matches user",
    reply.created_by_id,
    userAuth.user.id,
  );

  // 6. Update the reply body content
  const replyBodyUpdated = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 12,
  });
  const replyUpdated =
    await api.functional.discussionBoard.user.threads.posts.comments.replies.update(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: comment.id,
        replyId: reply.id,
        body: {
          body: replyBodyUpdated,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(replyUpdated);
  TestValidator.equals(
    "reply body matches updated content",
    replyUpdated.body,
    replyBodyUpdated,
  );
  TestValidator.equals(
    "reply id unchanged after update",
    replyUpdated.id,
    reply.id,
  );
  TestValidator.equals(
    "reply parent_id unchanged after update",
    replyUpdated.parent_id,
    reply.parent_id,
  );
  TestValidator.notEquals(
    "reply updated_at is different after update",
    replyUpdated.updated_at,
    reply.updated_at,
  );
}
