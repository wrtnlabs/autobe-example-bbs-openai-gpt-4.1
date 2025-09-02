import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * Test vote deletion permissions: ensure only vote owners can delete their
 * own votes.
 *
 * This test validates that a vote cast on a post in the discussion board
 * can be hard-deleted by its owner, but not by other users. The workflow
 * reflects realistic user actions and enforces business rules governing
 * vote management and permission checks.
 *
 * Business context: Forum permissions must prevent non-owners from deleting
 * votes, critical for integrity of voting records and preventing malicious
 * or unauthorized manipulation by others.
 *
 * Steps:
 *
 * 1. Register User A (becomes current authenticated user).
 * 2. As User A, create a discussion thread to provide a post container.
 * 3. As User A, create a post in the thread.
 * 4. As User A, post a vote (upvote/downvote) on the post.
 * 5. As User A, delete their own vote and verify deletion completes (no
 *    error).
 * 6. Register User B (context switches to this user/account).
 * 7. As User B (NOT the owner), attempt to delete User A's vote and verify a
 *    permission error is thrown.
 *
 * Validates:
 *
 * - Vote deletion by owner is successful.
 * - Vote deletion by non-owner is denied (error scenario).
 */
export async function test_api_vote_deletion_only_owner_success_and_permission_error(
  connection: api.IConnection,
) {
  // 1. Register User A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAUsername = RandomGenerator.name();
  const userA: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userAEmail,
        username: userAUsername,
        password: "Password1!",
        consent: true,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(userA);

  // 2. As User A, create a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 6,
          wordMax: 12,
        }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. As User A, create a post in the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 16,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. As User A, cast a vote on the post
  const vote = await api.functional.discussionBoard.user.votes.create(
    connection,
    {
      body: {
        discussion_board_post_id: post.id,
        discussion_board_comment_id: null,
        vote_type: RandomGenerator.pick(["up", "down"] as const),
      } satisfies IDiscussionBoardVote.ICreate,
    },
  );
  typia.assert(vote);

  // 5. As User A, delete their vote (should succeed)
  await api.functional.discussionBoard.user.votes.erase(connection, {
    voteId: vote.id,
  });
  // No error means deletion success

  // 6. Register User B (this will log us out from User A, and in as B)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userBEmail,
        username: RandomGenerator.name(),
        password: "Password1!",
        consent: true,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(userB);

  // 7. As User B, attempt to delete User A's vote - should fail (forbidden)
  await TestValidator.error(
    "non-owner cannot delete another user's vote",
    async () => {
      await api.functional.discussionBoard.user.votes.erase(connection, {
        voteId: vote.id,
      });
    },
  );
}
