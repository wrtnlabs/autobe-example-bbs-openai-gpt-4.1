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

export async function test_api_moderator_comment_update_forbidden_on_deleted_comment(
  connection: api.IConnection,
) {
  /**
   * Validates that a moderator cannot update a comment that has already been
   * soft-deleted.
   *
   * This test covers the following workflow:
   *
   * 1. Register a user, log in.
   * 2. User creates a thread.
   * 3. User creates a post in the thread.
   * 4. Register a moderator, log in (separate account).
   * 5. Moderator creates a comment on the post.
   * 6. Moderator soft-deletes the comment.
   * 7. Attempt to update the soft-deleted comment as moderator (should fail).
   *
   * This enforces correct moderation business logic and API security.
   */
  // 1. Register and login user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.name();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // 2. Create thread
  const threadInput = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardThread.ICreate;
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: threadInput,
    },
  );
  typia.assert(thread);

  // 3. Create post in the thread
  const postInput = {
    thread_id: thread.id,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardPost.ICreate;
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: postInput,
    },
  );
  typia.assert(post);

  // 4. Register and login as moderator (separate account for correct role context)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorAuth);

  // Always ensure we're logged in as moderator for comment actions
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 5. Moderator creates comment
  const commentBody = RandomGenerator.paragraph({ sentences: 7 });
  const commentCreateInput = {
    post_id: post.id,
    body: commentBody,
  } satisfies IDiscussionBoardComment.ICreate;
  const comment =
    await api.functional.discussionBoard.moderator.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: commentCreateInput,
      },
    );
  typia.assert(comment);

  // 6. Moderator soft-deletes the comment
  await api.functional.discussionBoard.moderator.threads.posts.comments.erase(
    connection,
    {
      threadId: thread.id,
      postId: post.id,
      commentId: comment.id,
    },
  );

  // 7. Attempt to update the deleted comment as moderator (should fail)
  await TestValidator.error(
    "cannot update a comment that has been soft deleted",
    async () => {
      await api.functional.discussionBoard.moderator.threads.posts.comments.update(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: comment.id,
          body: {
            body: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
  // The API is expected to respond with an error and the comment remains unchanged (uneditable).
}
