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
 * Validate comment update error scenarios for moderator with invalid
 * payloads.
 *
 * This test ensures the system enforces payload validation on moderator
 * comment updates. It executes:
 *
 * 1. Moderator account creation and authentication
 * 2. User account creation and authentication
 * 3. User creates a discussion thread
 * 4. User creates a post inside that thread
 * 5. Moderator creates a comment on that post
 * 6. Moderator attempts multiple invalid comment updates:
 *
 *    - Body is empty string
 *    - Body is excessively long (e.g., >5000 chars)
 *    - Update payload missing the body property entirely (empty object)
 *
 *     For each invalid update:
 *
 *        - Expect API to return error (TestValidator.error/await)
 *        - (If GET endpoint existed) After error, verify comment is unchanged
 *
 * All steps use SDK functions and DTOs as provided, with strict type
 * safety, descriptive variables, and proper authentication context
 * switching for role separation. Negative path tests only cover what can be
 * implemented within the provided type definitions and API surface.
 */
export async function test_api_moderator_comment_update_invalid_payload(
  connection: api.IConnection,
) {
  // 1. Moderator account creation & authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Moderator!234";
  const moderatorUsername = RandomGenerator.name();
  // Join as moderator
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // Login again to ensure working session
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 2. User account creation & authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "User!234";
  const userUsername = RandomGenerator.name();
  // Join as user
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);
  // Login as user
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 3. User creates a discussion thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 12,
        }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 4. User creates a post inside that thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 6 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // Switch back to moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 5. Moderator creates a comment
  const comment =
    await api.functional.discussionBoard.moderator.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph({ sentences: 14 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // No GET endpoint for re-checking, so cannot re-fetch for unchanged validation

  // 6a. Invalid update: body is empty string
  await TestValidator.error(
    "update comment with empty body should fail",
    async () => {
      await api.functional.discussionBoard.moderator.threads.posts.comments.update(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: comment.id,
          body: { body: "" } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
  // 6b. Invalid update: body is excessively long
  await TestValidator.error(
    "update comment with excessively long body should fail",
    async () => {
      await api.functional.discussionBoard.moderator.threads.posts.comments.update(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: comment.id,
          body: {
            body: RandomGenerator.paragraph({ sentences: 6000 }),
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
  // 6c. Invalid update: update payload missing the body property entirely (empty object)
  await TestValidator.error(
    "update comment with missing body property should fail",
    async () => {
      await api.functional.discussionBoard.moderator.threads.posts.comments.update(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: comment.id,
          body: {} satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
  // No supported way to re-fetch the comment for equality checking since GET endpoint not provided; data immutability checks omitted.
}
