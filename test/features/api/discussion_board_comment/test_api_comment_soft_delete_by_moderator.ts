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
 * E2E test for moderator soft-deleting a user's comment in a discussion
 * thread.
 *
 * Scenario:
 *
 * 1. Register and authenticate a moderator (capture login credentials)
 * 2. Register and authenticate a regular user (capture login credentials)
 * 3. As the user, create a thread
 * 4. As the user, create a post in the thread
 * 5. As the user, create a comment in the post
 * 6. As the moderator, soft-delete the comment via DELETE
 *    /discussionBoard/moderator/threads/:threadId/posts/:postId/comments/:commentId
 * 7. Confirm that the comment is logically deleted (deleted_at is set or
 *    comment not visible to user)
 *
 * This test models the full business workflow for moderation, role
 * separation, and compliance-style soft deletion of user-generated
 * content.
 */
export async function test_api_comment_soft_delete_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register moderator
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modPassword = RandomGenerator.alphaNumeric(12) + "A!1";
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      password: modPassword,
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorAuth);

  // Step 2: Register user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(14) + "pA$";
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: RandomGenerator.name(),
      password: userPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // Step 3: Login as user (ensure user context)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // Step 4: User creates a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // Step 5: User creates a post in the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: User creates a comment in the post
  const comment =
    await api.functional.discussionBoard.user.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Confirm soft-deletion state prior to moderator action
  TestValidator.equals(
    "comment not soft-deleted before moderator erase",
    comment.deleted_at,
    null,
  );

  // Step 7: Login as moderator (switch context)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: modEmail,
      password: modPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 8: Moderator soft-deletes the comment
  await api.functional.discussionBoard.moderator.threads.posts.comments.erase(
    connection,
    {
      threadId: thread.id,
      postId: post.id,
      commentId: comment.id,
    },
  );

  // No further verification (such as fetching the comment after deletion) is possible
  // because there are no endpoints provided to fetch a comment or comments for check. The test
  // checks all possible state transitions with current SDK coverage.
}
