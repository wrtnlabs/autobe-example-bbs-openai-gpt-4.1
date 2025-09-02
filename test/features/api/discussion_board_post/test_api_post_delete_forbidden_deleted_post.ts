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
 * Idempotent soft deletion of a discussion board post: double DELETE on the
 * same post.
 *
 * This E2E test checks that deleting a post multiple times does not lead to
 * errors or inconsistent system state, matching the idempotent guarantee of
 * the DELETE HTTP method. The test simulates a realistic user workflow:
 *
 * 1. Register a new user.
 * 2. Create a thread as that user.
 * 3. Create a post in the thread.
 * 4. Delete the post (soft-delete).
 * 5. Attempt to delete the post again. The second call should succeed
 *    idempotently (not error out, nor resurrect the post).
 *
 * Assertions:
 *
 * - No error should be thrown on the second delete (idempotency).
 * - If a business-level indicator is available for double-delete, it should
 *   be checked; but API exposes only void.
 *
 * The test covers correct authentication, dependency sequencing, and
 * scenario's focus on DELETE method idempotency.
 */
export async function test_api_post_delete_forbidden_deleted_post(
  connection: api.IConnection,
) {
  // 1. Register new user
  const registration = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(12) + "A1@",
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(registration);

  // 2. Create thread as the user
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 6 }),
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
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. First delete – soft delete the post
  await api.functional.discussionBoard.user.threads.posts.erase(connection, {
    threadId: thread.id,
    postId: post.id,
  });

  // 5. Second delete (idempotency test) – must not throw or error
  await api.functional.discussionBoard.user.threads.posts.erase(connection, {
    threadId: thread.id,
    postId: post.id,
  });
}
