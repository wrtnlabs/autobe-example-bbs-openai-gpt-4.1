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
 * Ensure users cannot update comments authored by others.
 *
 * This test validates that a user (User B) is prevented from updating a
 * comment created by another user (User A). The scenario involves:
 *
 * - Registering User A and having them create a thread, post, and comment
 * - Registering User B and switching authentication
 * - User B attempts to update the comment (which should fail due to lack of
 *   ownership)
 *
 * Steps:
 *
 * 1. Register User A (save email, username, pw)
 * 2. As User A: create thread
 * 3. As User A: create post in thread
 * 4. As User A: create comment on post
 * 5. Register User B with different email/username
 * 6. Log in as User B (switch context)
 * 7. B attempts to update the comment created by A — must fail
 * 8. Assert error thrown (permission denied/error status)
 */
export async function test_api_user_comment_update_permission_denied_on_another_users_comment(
  connection: api.IConnection,
) {
  // 1. Register User A
  const userACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: "UserApassw0rd!",
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const userA = await api.functional.auth.user.join(connection, {
    body: userACredentials,
  });
  typia.assert(userA);

  // 2. Create thread as User A
  const threadTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 9,
  });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    { body: { title: threadTitle } satisfies IDiscussionBoardThread.ICreate },
  );
  typia.assert(thread);

  // 3. Create post as User A
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 10,
  });
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

  // 4. Create comment as User A
  const commentBody = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 12,
  });
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

  // 5. Register User B
  const userBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: "UserBpassw0rd!",
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const userB = await api.functional.auth.user.join(connection, {
    body: userBCredentials,
  });
  typia.assert(userB);

  // 6. Log in as User B to switch context
  await api.functional.auth.user.login(connection, {
    body: {
      email: userBCredentials.email,
      password: userBCredentials.password,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 7. User B attempts to update User A's comment (should fail)
  await TestValidator.error(
    "User B cannot update another user's comment",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.comments.update(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: comment.id,
          body: {
            body: RandomGenerator.paragraph({
              sentences: 4,
              wordMin: 6,
              wordMax: 12,
            }),
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
}
