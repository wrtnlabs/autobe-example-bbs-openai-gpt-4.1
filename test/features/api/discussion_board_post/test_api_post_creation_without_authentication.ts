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
 * Validate that unauthenticated users cannot create a post in a discussion
 * thread.
 *
 * This test ensures that the API enforces authentication by rejecting
 * attempts to create posts in a discussion thread when no authentication
 * token is present. Proper permission enforcement is critical for content
 * integrity and access control in the discussion board.
 *
 * Steps:
 *
 * 1. Register and authenticate a new user, which is required to create a
 *    thread.
 * 2. Use this user to create a new discussion thread.
 * 3. Prepare an unauthenticated API connection (no Authorization header).
 * 4. Attempt to create a post in the thread with the unauthenticated
 *    connection.
 * 5. Assert that the API rejects the operation with a suitable
 *    permission/authentication error.
 */
export async function test_api_post_creation_without_authentication(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a user to set up a valid thread
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = "Password123!";
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: username,
      password: password,
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);

  // 2. Create a new discussion thread via authenticated user
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 9,
        }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Prepare an unauthenticated API connection (no Authorization header)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {}, // ensure no authorization present
  };

  // 4. Attempt to create a post in the thread with unauthenticated context
  await TestValidator.error(
    "unauthenticated post creation should be forbidden",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.create(
        unauthConnection,
        {
          threadId: thread.id,
          body: {
            thread_id: thread.id,
            title: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 5,
              wordMax: 12,
            }),
            body: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 2,
              sentenceMax: 6,
              wordMin: 5,
              wordMax: 10,
            }),
          } satisfies IDiscussionBoardPost.ICreate,
        },
      );
    },
  );
}
