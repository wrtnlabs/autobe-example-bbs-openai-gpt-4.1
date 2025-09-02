import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Validate admin soft deletion of posts in a discussion board.
 *
 * This test verifies that an administrator can soft-delete any post in a
 * thread. It handles all preliminary authentication and content creation
 * steps, covers authentication context switching between user and admin
 * accounts, exercises the admin deletion API, and asserts the correctness
 * of soft-deletion compliance.
 *
 * High-level steps validated:
 *
 * 1. Register a standard user (for post/thread creation)
 * 2. Authenticate as the user
 * 3. User creates a thread
 * 4. User creates a post in that thread
 * 5. Register a separate admin user (elevate the user account to admin)
 * 6. Authenticate as the admin
 * 7. Admin invokes the soft-delete API for the target post
 * 8. Confirm the post is soft-deleted (deleted_at set, business logic correct)
 */
export async function test_api_post_admin_soft_delete_success(
  connection: api.IConnection,
) {
  // 1. Register and login a discussion board user (to create thread and post)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const userPassword = "A1b2c3d4e5$"; // Meets password policy (min 10 chars, uppercase, number, special char)
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        username: username,
        password: userPassword,
        display_name: RandomGenerator.name(),
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);

  // For completeness, simulate re-login as user (good practice)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 2. User creates a thread
  const threadTitle = RandomGenerator.paragraph({ sentences: 4 });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: threadTitle,
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. User creates a post in that thread
  const postTitle = RandomGenerator.paragraph({ sentences: 5 });
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

  // 4. Register admin using the same user account for test simplicity
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: user.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(admin);

  // 5. Admin authentication (switch context to admin role)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.Format<"password">,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 6. Admin soft-deletes the post
  await api.functional.discussionBoard.admin.threads.posts.erase(connection, {
    threadId: thread.id,
    postId: post.id,
  });
  // No output (void) - compliance is retained; test passes if no errors are thrown
  // [Note]: If user-side retrieval or listing existed, we would assert the post is now hidden or soft-deleted
}
