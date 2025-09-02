import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test failure when creating a comment on a soft-deleted post.
 *
 * This test ensures that the API correctly prevents comments from being
 * created on posts that have been soft-deleted (i.e., marked as deleted but
 * retained for audit/compliance purposes). It covers realistic business
 * flow and validates robust resource status checks:
 *
 * 1. Register and authenticate a user.
 * 2. Create a new discussion thread.
 * 3. Create a post within the thread.
 * 4. Delete (soft-delete) the post as the original author.
 * 5. Attempt to create a comment on the now-deleted post and validate error
 *    response (404 or business constraint error).
 *
 * This protects platform integrity by ensuring deleted discussions cannot
 * be replied to, and audit trails remain intact.
 */
export async function test_api_comment_creation_failure_on_deleted_post(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username =
    RandomGenerator.name().replace(/\s/g, "_") +
    RandomGenerator.alphaNumeric(4);
  const password = "Abcd1234!@#" + RandomGenerator.alphaNumeric(4);
  const displayName = RandomGenerator.name();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Create a new discussion thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create a post in the thread
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

  // 4. Soft-delete the post as the original author
  await api.functional.discussionBoard.user.threads.posts.erase(connection, {
    threadId: thread.id,
    postId: post.id,
  });

  // 5. Attempt to create a comment on the now-deleted post (should fail)
  await TestValidator.error(
    "cannot create comment on soft-deleted post",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.comments.create(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          body: {
            post_id: post.id,
            body: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );
}
