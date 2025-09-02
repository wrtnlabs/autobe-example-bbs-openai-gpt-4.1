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
 * E2E test: Successfully create a reply to an existing comment in a
 * discussion thread as a user.
 *
 * This test covers the full business workflow required for reply creation,
 * including authentication, thread, post, comment, and reply setup. It
 * confirms that replies are nested and attributed correctly.
 *
 * Steps:
 *
 * 1. Register a new user (establish authentication context)
 * 2. Create a thread as the authenticated user
 * 3. Create a post in the thread
 * 4. Create a top-level comment on the post
 * 5. Submit a reply (nested comment) under the created comment
 * 6. Validate reply's parent linkage, user attribution, and proper nesting
 */
export async function test_api_reply_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new user (for authentication)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userName = RandomGenerator.name();
  const password = "StrongP@ssw0rd!";
  const authorized = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userName,
      password: password,
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(authorized);
  TestValidator.predicate(
    "user is verified after join (should be false by default)",
    authorized.user.is_verified === false,
  );

  // 2. Create a new thread as the authenticated user
  const threadTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 14,
  });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: threadTitle,
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);
  TestValidator.equals(
    "thread created_by_id attribution matches user",
    thread.created_by_id,
    authorized.user.id,
  );
  TestValidator.equals("thread title set correctly", thread.title, threadTitle);

  // 3. Create a post within the thread
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
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
  TestValidator.equals(
    "post thread_id matches thread",
    post.thread_id,
    thread.id,
  );
  TestValidator.equals(
    "post created_by_id attribution matches user",
    post.created_by_id,
    authorized.user.id,
  );
  TestValidator.equals("post title set correctly", post.title, postTitle);
  TestValidator.equals("post body set correctly", post.body, postBody);

  // 4. Create a top-level comment on the post
  const commentBody = RandomGenerator.paragraph({ sentences: 6 });
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
  TestValidator.equals(
    "comment post_id matches post",
    comment.post_id,
    post.id,
  );
  TestValidator.equals(
    "comment is top-level (parent_id null)",
    comment.parent_id,
    null,
  );
  TestValidator.equals(
    "comment created_by_id matches user",
    comment.created_by_id,
    authorized.user.id,
  );
  TestValidator.predicate(
    "comment nesting_level == 0 for top-level",
    comment.nesting_level === 0,
  );

  // 5. Create a reply under the created comment
  const replyBody = RandomGenerator.paragraph({ sentences: 4 });
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
          body: replyBody,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(reply);
  TestValidator.equals("reply post_id matches post", reply.post_id, post.id);
  TestValidator.notEquals(
    "reply and parent comment should have different ids",
    reply.id,
    comment.id,
  );
  TestValidator.equals(
    "reply parent_id points to parent comment",
    reply.parent_id,
    comment.id,
  );
  TestValidator.predicate(
    "reply parent_id is not null",
    reply.parent_id !== null && reply.parent_id !== undefined,
  );
  TestValidator.equals(
    "reply created_by_id matches user",
    reply.created_by_id,
    authorized.user.id,
  );
  TestValidator.equals("reply body matches input", reply.body, replyBody);
  TestValidator.predicate(
    "reply nesting_level is 1 (child)",
    reply.nesting_level === 1,
  );
}
