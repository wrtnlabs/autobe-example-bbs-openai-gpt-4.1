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
 * Test soft deletion of a reply by the reply's author on the discussion
 * board.
 *
 * This test verifies that when a user deletes their own reply (which is
 * implemented as a nested comment), the API performs a soft delete (sets
 * deleted_at), and the operation succeeds with proper ownership.
 *
 * Scenario:
 *
 * 1. Register a user and authenticate (store connection/headers)
 * 2. Create a thread as this user
 * 3. Create a post in that thread
 * 4. Create a comment on the post
 * 5. Create a reply to that comment (as a nested comment)
 * 6. Delete (soft delete) the reply as the reply's owner
 * 7. Validate that before deletion, the reply's deleted_at property is
 *    null/undefined
 * 8. Due to API limitations (no direct reply-retrieval post-deletion), we
 *    cannot directly validate after deletion other than ensuring erase
 *    succeeded and would mark the reply as soft-deleted.
 */
export async function test_api_reply_delete_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name().replace(/\s/g, "_");
  const password = RandomGenerator.alphaNumeric(12) + "A!1";
  const displayName = RandomGenerator.name();
  const joinRes = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinRes);

  // 2. Create thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
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
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create comment on post
  const comment =
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
  typia.assert(comment);

  // 5. Create reply to comment (as a nested comment)
  const reply =
    await api.functional.discussionBoard.user.threads.posts.comments.replies.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        commentId: comment.id,
        body: {
          post_id: post.id,
          parent_id: comment.id,
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(reply);

  // 7. Validate that reply is NOT yet deleted (deleted_at not set)
  TestValidator.predicate(
    "Reply should not initially be soft-deleted (deleted_at is null or undefined)",
    reply.deleted_at === undefined || reply.deleted_at === null,
  );

  // 6. Soft delete the reply as its author
  await api.functional.discussionBoard.user.threads.posts.comments.replies.erase(
    connection,
    {
      threadId: thread.id,
      postId: post.id,
      commentId: comment.id,
      replyId: reply.id,
    },
  );

  // 8. NOTE: Due to API limitations (no reply get/list after deletion),
  //    further validation (e.g., that deleted_at is set) is not possible here.
  //    We simply check that erase succeeded with no error (ownership enforced by flow).
}
