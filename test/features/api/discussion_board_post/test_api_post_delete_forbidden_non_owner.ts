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
 * Verify that users cannot delete posts they do not own.
 *
 * Test steps:
 *
 * 1. Register user1 and confirm authentication.
 * 2. As user1, create a unique thread.
 * 3. As user1, create a post within the thread and record its ID.
 * 4. Register user2 (triggers context switch; further requests are as user2).
 * 5. As user2, attempt to delete user1's post and expect a permission error.
 */
export async function test_api_post_delete_forbidden_non_owner(
  connection: api.IConnection,
) {
  // 1. Register user1
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Username = RandomGenerator.name();
  const user1Password = "TestUser1!Passwd42";
  await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Username,
      password: user1Password,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });

  // 2. As user1, create a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. As user1, create post in thread
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

  // 4. Register user2 (automatically switches context to user2)
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.name();
  const user2Password = "TestUser2!Diffpw38";
  await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Username,
      password: user2Password,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });

  // 5. As user2, attempt to delete user1's post. Should throw a permission error.
  await TestValidator.error(
    "Non-owner cannot delete another user's post",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.erase(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
        },
      );
    },
  );
}
