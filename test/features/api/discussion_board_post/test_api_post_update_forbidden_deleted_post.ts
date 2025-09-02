import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

/**
 * Attempt to update a post that has been soft-deleted (should fail).
 *
 * Validates that once a post is soft-deleted (deleted_at set), attempts to
 * update the post by its author are forbidden or result in a not-found
 * error, enforcing correct post lifecycle integrity and access controls.
 *
 * Workflow:
 *
 * 1. User registers (join), establishing authentication
 * 2. User creates a thread
 * 3. User creates a post in the thread
 * 4. User deletes (soft deletes) the post
 * 5. User attempts to update the deleted post (should yield
 *    forbidden/not-found)
 *
 * This confirms that actions on deleted posts are not possible by regular
 * users and content cannot be resurrected illicitly.
 */
export async function test_api_post_update_forbidden_deleted_post(
  connection: api.IConnection,
) {
  // 1. Register a user account for authorization context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "P@ssword123!";
  const username = RandomGenerator.name().replace(/\s+/g, "_");
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password: userPassword,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Create a new thread as the user
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create a post in the created thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Soft delete (erase) the post
  await api.functional.discussionBoard.user.threads.posts.erase(connection, {
    threadId: thread.id,
    postId: post.id,
  });

  // 5. Attempt to update the soft-deleted post (must fail with forbidden/not-found)
  await TestValidator.error(
    "update should be forbidden/not-found on soft-deleted post",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.update(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          body: {
            title: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies IDiscussionBoardPost.IUpdate,
        },
      );
    },
  );
}
