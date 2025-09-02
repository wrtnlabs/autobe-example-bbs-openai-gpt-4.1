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
 * Test the API's maximum nesting level enforcement for discussion board
 * replies.
 *
 * - Registers a standard user and authenticates (via /auth/user/join)
 * - Creates a thread, a post in the thread, and a top-level comment
 * - Chains replies to the previous comment/reply up to the maximum allowed
 *   hierarchy depth (presumed 5)
 * - Confirms that nesting_level increments correctly for each reply
 * - Attempts to create a reply at nesting_level=limit+1, expecting a runtime
 *   error due to business rule violation
 * - Validates all API outputs and error path using typia.assert and
 *   TestValidator
 *
 * BUSINESS CONTEXT:
 *
 * - Validates system's business logic for reply nesting depth on comments,
 *   ensuring the tree hierarchy cannot exceed the permitted bound.
 *
 * PROCESS:
 *
 * 1. Register standard user & authenticate
 * 2. Create thread
 * 3. Create post in thread
 * 4. Create top-level comment in post (nesting level 0)
 * 5. Chain replies, each as child of previous, to maximum allowed depth
 * 6. Attempt to exceed max depth with extra reply and confirm error handling
 */
export async function test_api_reply_creation_exceeds_nesting_level(
  connection: api.IConnection,
) {
  // Configuration: set max nesting (business logic, presumed 5 if not specified)
  const NESTING_LIMIT = 5;

  // 1. Register and authenticate user
  const regInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name().replace(/\s+/g, "_"),
    password: "SeCur3!Passw0rd",
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const auth = await api.functional.auth.user.join(connection, {
    body: regInput,
  });
  typia.assert(auth);

  // 2. Create thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create post in thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Add a comment to the post (top-level)
  const comment =
    await api.functional.discussionBoard.user.threads.posts.comments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "top-level comment has nesting_level 0",
    comment.nesting_level,
    0,
  );

  // 5. Chain replies, each as reply to previous, up to NESTING_LIMIT
  let parentId = comment.id;
  for (let depth = 1; depth <= NESTING_LIMIT; ++depth) {
    const reply =
      await api.functional.discussionBoard.user.threads.posts.comments.replies.create(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: parentId,
          body: {
            post_id: post.id,
            parent_id: parentId,
            body: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(reply);
    TestValidator.equals(
      `reply at depth ${depth} has correct nesting_level`,
      reply.nesting_level,
      depth,
    );
    parentId = reply.id;
  }

  // 6. Attempt to exceed the allowed nesting depth, expect error
  await TestValidator.error(
    "creating reply beyond allowed nesting should fail",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.comments.replies.create(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: parentId,
          body: {
            post_id: post.id,
            parent_id: parentId,
            body: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );
}
