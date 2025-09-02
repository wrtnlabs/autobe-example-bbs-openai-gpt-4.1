import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate that a moderator cannot create a comment on a locked post.
 *
 * This test enforces the policy that no new comments (even from moderators)
 * can be added to posts that are locked. The workflow covers multi-actor
 * operation and permission enforcement in the discussion board.
 *
 * Steps:
 *
 * 1. Register and authenticate a moderator (account/role separation from user)
 * 2. Register and authenticate a standard user (for thread and post creation)
 * 3. As user, create a discussion thread
 * 4. As user, create a post inside the thread
 * 5. As user, lock the post using the post update endpoint
 * 6. Authenticate as moderator, and attempt to create a comment on the locked
 *    post
 * 7. Assert that the creation is forbidden (permission or validation error
 *    occurs)
 * 8. Optionally, verify (by side effect or error type) that no comment was
 *    actually added
 */
export async function test_api_moderator_comment_creation_forbidden_on_locked_post(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorP@ssw0rd!";
  const moderatorUsername = RandomGenerator.name();
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });

  // 2. Register and authenticate as user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword = "UserP@ssw0rd1!";
  const userUsername = RandomGenerator.name();
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });

  // Authenticate as user
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 3. Create thread as user
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 4. Create post as user
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. Lock the post as user
  const lockedPost =
    await api.functional.discussionBoard.user.threads.posts.update(connection, {
      threadId: thread.id,
      postId: post.id,
      body: {
        is_locked: true,
      } satisfies IDiscussionBoardPost.IUpdate,
    });
  typia.assert(lockedPost);
  TestValidator.equals("post should be locked", lockedPost.is_locked, true);

  // 6. Authenticate as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 7. Attempt to create a comment as moderator - should be forbidden
  await TestValidator.error(
    "moderator cannot comment on locked post",
    async () => {
      await api.functional.discussionBoard.moderator.threads.posts.comments.create(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          body: {
            post_id: post.id,
            body: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 3,
              sentenceMax: 8,
              wordMin: 3,
              wordMax: 12,
            }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );
}
