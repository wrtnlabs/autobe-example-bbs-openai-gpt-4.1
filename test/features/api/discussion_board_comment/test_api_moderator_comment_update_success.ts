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
 * Test that a moderator can successfully update a comment they previously
 * created under a thread post.
 *
 * Steps:
 *
 * 1. Register and login as a user (to create thread and post).
 * 2. Create a thread as a user.
 * 3. Create a post inside the thread as a user.
 * 4. Register and login as a moderator (to perform moderator comment actions).
 * 5. As a moderator, create a comment on the user's post.
 * 6. As the same moderator, update the previously created comment.
 * 7. Assert the comment's new body matches the update request and its
 *    updated_at timestamp is later than its original created_at.
 */
export async function test_api_moderator_comment_update_success(
  connection: api.IConnection,
) {
  // Step 1: Register and login as a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "Abcd1234!@#";
  const userUsername = RandomGenerator.name();
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // Step 2: Create a thread as a user
  const threadTitle = RandomGenerator.paragraph({ sentences: 4 });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: { title: threadTitle } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // Step 3: Create a post inside the thread as a user
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postBody = RandomGenerator.content({ paragraphs: 1 });
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

  // Step 4: Register and login as a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Abcd1234!@#";
  const moderatorUsername = RandomGenerator.name();
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorAuth);

  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 5: As moderator, create a comment
  const originalCommentBody = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await api.functional.discussionBoard.moderator.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: originalCommentBody,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 6: As the same moderator, update the comment
  const updatedCommentBody = RandomGenerator.paragraph({ sentences: 5 });
  const updated =
    await api.functional.discussionBoard.moderator.threads.posts.comments.update(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: comment.id,
        body: {
          body: updatedCommentBody,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updated);

  // Step 7: Assert that the change is reflected and timestamps monotonicity
  TestValidator.equals(
    "comment id unchanged after update",
    updated.id,
    comment.id,
  );
  TestValidator.equals(
    "comment post_id unchanged after update",
    updated.post_id,
    comment.post_id,
  );
  TestValidator.equals(
    "comment body is updated",
    updated.body,
    updatedCommentBody,
  );
  TestValidator.predicate(
    "updated_at timestamp is newer than created_at after update",
    new Date(updated.updated_at).getTime() >
      new Date(comment.created_at).getTime(),
  );
}
