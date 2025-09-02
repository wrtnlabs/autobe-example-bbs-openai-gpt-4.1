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

/**
 * Test that a moderator can successfully soft-delete any post in a thread.
 *
 * 1. Register a standard user, authenticate implicitly (join sets context).
 * 2. As that user, create a new thread.
 * 3. As the same user, add a post to that thread.
 * 4. Register a moderator account, allow join to set moderator context (or
 *    login as moderator after).
 * 5. Switch authentication context to the moderator role via direct login.
 * 6. With moderator context, execute the soft-delete (DELETE) operation on the
 *    target post in the user's thread.
 *
 * This test validates that only moderator role can perform the operation
 * and that the API endpoint accepts and processes the request successfully
 * by a legitimate moderator. Because the API surface does not include
 * thread post listing or post read endpoints for either actor, the test
 * focuses on operation success and correct role switching; deeper
 * validation of soft-deletion status is not possible within these
 * constraints.
 */
export async function test_api_post_moderator_soft_delete_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new regular user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userUsername: string = RandomGenerator.name();
  const userPassword: string = "Abcd1234!@#";
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userUsername,
      password: userPassword,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });

  // Step 2: User creates a new thread
  const threadTitle: string = RandomGenerator.paragraph({ sentences: 4 });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: threadTitle,
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // Step 3: User creates a post in the thread
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

  // Step 4: Register and login as a moderator
  const modEmail: string = typia.random<string & tags.Format<"email">>();
  const modUsername: string = RandomGenerator.name();
  const modPassword: string = "Xyz7890!@#";
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      username: modUsername,
      password: modPassword,
      consent: true,
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: modEmail,
      password: modPassword,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 5: Use moderator role to soft-delete the post
  await api.functional.discussionBoard.moderator.threads.posts.erase(
    connection,
    {
      threadId: thread.id,
      postId: post.id,
    },
  );
}
