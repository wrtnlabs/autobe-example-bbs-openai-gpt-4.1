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
 * Validate that a user cannot update a reply they do not own (forbidden
 * update).
 *
 * This test ensures that forum reply ownership permissions are strictly
 * enforced. It covers the entire resource chain (thread → post → comment →
 * reply) and verifies that a user other than the author is denied when
 * trying to edit a reply.
 *
 * Steps:
 *
 * 1. Register and log in as user1 (owner of reply)
 * 2. User1 creates a thread
 * 3. User1 creates a post in the thread
 * 4. User1 creates a comment on that post
 * 5. User1 creates a reply to the comment (record all relevant IDs)
 * 6. Register user2 and switch authentication to user2
 * 7. Attempt to update the reply as user2 using appropriate API and payload
 * 8. Expect forbidden error (permission denied)
 */
export async function test_api_reply_update_forbidden_for_non_owner(
  connection: api.IConnection,
) {
  // 1. Register and log in as user1
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Username = RandomGenerator.name(2).replace(/\s/g, "_");
  const user1Password = RandomGenerator.alphaNumeric(12) + "A$1";
  const user1: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user1Email,
        username: user1Username,
        password: user1Password,
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user1);

  // 2. User1 creates thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. User1 creates post
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. User1 creates comment
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

  // 5. User1 creates reply to comment
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

  // 6. Register user2 and switch authentication
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.name(2).replace(/\s/g, "-");
  const user2Password = RandomGenerator.alphaNumeric(12) + "B$2";
  const user2: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user2Email,
        username: user2Username,
        password: user2Password,
        consent: true,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user2);

  // 7. Attempt to update the reply using user2's authentication
  await TestValidator.error(
    "non-owner cannot update a reply (should be forbidden)",
    async () => {
      await api.functional.discussionBoard.user.threads.posts.comments.replies.update(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: comment.id,
          replyId: reply.id,
          body: {
            body: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
}
