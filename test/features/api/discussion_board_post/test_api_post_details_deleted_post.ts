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
 * Verify fetching of a soft-deleted discussion board post does not reveal
 * the post.
 *
 * This test exercises the entire lifecycle of creating and soft-deleting a
 * post, then validating the post's detail endpoint returns not-found (or an
 * appropriate error) after deletion.
 *
 * Steps:
 *
 * 1. Register a new user (author) and establish authentication context
 * 2. User creates a new thread
 * 3. User creates a post in the thread
 * 4. User soft-deletes the post
 * 5. Attempt to access the deleted post's details as an unauthenticated (no
 *    Authorization) user
 * 6. Validate a not-found error or equivalent is returned
 */
export async function test_api_post_details_deleted_post(
  connection: api.IConnection,
) {
  // 1. Register user (author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorUsername = RandomGenerator.name();
  const authorPassword = "TestPassword!1234";
  const author: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: authorEmail,
        username: authorUsername,
        password: authorPassword,
        display_name: RandomGenerator.name(),
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(author);

  // 2. Create a thread as author
  const thread: IDiscussionBoardThread =
    await api.functional.discussionBoard.user.threads.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardThread.ICreate,
    });
  typia.assert(thread);

  // 3. Create a post in thread as author
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.user.threads.posts.create(connection, {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
          wordMin: 3,
          wordMax: 7,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);

  // 4. Soft-delete the post as author
  await api.functional.discussionBoard.user.threads.posts.erase(connection, {
    threadId: thread.id,
    postId: post.id,
  });

  // 5. Switch to unauthenticated context (no Authorization header)
  const anonConnection: api.IConnection = { ...connection, headers: {} };

  // 6. Attempt to fetch the deleted post as unauthenticated user and expect an error
  await TestValidator.error(
    "fetching a soft-deleted post should fail with not found",
    async () => {
      await api.functional.discussionBoard.threads.posts.at(anonConnection, {
        threadId: thread.id,
        postId: post.id,
      });
    },
  );
}
