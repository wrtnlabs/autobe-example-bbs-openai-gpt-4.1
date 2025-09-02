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
 * Test unique per-thread post title business rule.
 *
 * Validates that two posts with the same title cannot exist within the same
 * thread—only the first post should be created, and the second attempt (by
 * the same user, same thread, same title) must be rejected.
 *
 * Steps:
 *
 * 1. Register a user via the join endpoint to prepare credentials for post
 *    creation.
 * 2. Authenticate as the new user (implicit via join—token attached to
 *    connection).
 * 3. Create a new discussion thread.
 * 4. Create a first post with a unique title in the thread (should succeed).
 * 5. Attempt to create a second post in the same thread with the same title
 *    (different body).
 *
 *    - This must fail due to the unique title constraint within a thread.
 *    - The API should return a validation/error response.
 * 6. Validate: a) First post is created and fields match inputs. b) Duplicate
 *    creation throws a runtime error (using TestValidator.error with a
 *    descriptive title).
 */
export async function test_api_post_creation_duplicate_title_in_thread(
  connection: api.IConnection,
) {
  // 1. Register a new user (also logs in and attaches token).
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name().replace(/\s+/g, "_");
  const password = RandomGenerator.alphaNumeric(12) + "Z@1";
  const display_name = RandomGenerator.name();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Create a new thread
  const threadTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 6,
    wordMax: 12,
  });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: threadTitle,
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create the first post with a specific title
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 6,
    wordMax: 12,
  });
  const firstPostBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 16,
    wordMin: 4,
    wordMax: 16,
  });
  const firstPost =
    await api.functional.discussionBoard.user.threads.posts.create(connection, {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: postTitle,
        body: firstPostBody,
      } satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(firstPost);
  TestValidator.equals(
    "first post: thread matches",
    firstPost.thread_id,
    thread.id,
  );
  TestValidator.equals("first post: title matches", firstPost.title, postTitle);
  TestValidator.equals(
    "first post: body matches",
    firstPost.body,
    firstPostBody,
  );

  // 4. Attempt to create a second post with same title
  const secondPostBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 14,
    wordMin: 4,
    wordMax: 16,
  });
  await TestValidator.error(
    "should reject duplicate post title in same thread",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.create(
        connection,
        {
          threadId: thread.id,
          body: {
            thread_id: thread.id,
            title: postTitle, // same title (should fail)
            body: secondPostBody, // body is different - title collision is what matters
          } satisfies IDiscussionBoardPost.ICreate,
        },
      );
    },
  );
}
