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
 * Test that a user cannot update a post they do not own.
 *
 * Business purpose: Validates that only the owner of a post (or users with
 * special roles) can perform update operations. This enforces proper
 * authorization, ensuring users are restricted from modifying content
 * belonging to others.
 *
 * Steps:
 *
 * 1. Register User1 and authenticate (who will create thread & post).
 * 2. As User1, create a thread.
 * 3. As User1, create a post in that thread.
 * 4. Register User2 and authenticate (connection context switches to User2).
 * 5. As User2, attempt to update (PUT) the post created by User1 with new
 *    title and body.
 * 6. Verify the operation is forbidden (error is thrown), confirming access
 *    control is enforced.
 */
export async function test_api_post_update_forbidden_non_owner(
  connection: api.IConnection,
) {
  // 1. Register User1 and authenticate (connection context is now User1)
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Username = RandomGenerator.name();
  const user1Password = "TestPassword1!";
  const user1Auth = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Username,
      password: user1Password,
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user1Auth);
  // Now authenticated as User1

  // 2. As User1, create a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. As User1, create a post in the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Register User2 and authenticate (context switches)
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.name();
  const user2Password = "AnotherPass2!";
  const user2Auth = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Username,
      password: user2Password,
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user2Auth);
  // Now authenticated as User2

  // 5. As User2, attempt to update User1's post
  await TestValidator.error(
    "forbidden error when non-owner attempts post update",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.update(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            body: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies IDiscussionBoardPost.IUpdate,
        },
      );
    },
  );
}
