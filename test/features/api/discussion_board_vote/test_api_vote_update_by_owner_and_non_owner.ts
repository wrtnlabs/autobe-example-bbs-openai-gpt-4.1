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
 * Test that only the owner of a vote can update it (upvote<->downvote), and
 * that updating by a non-owner is rejected. Also verify all access handoff
 * and session handling is correct.
 *
 * Steps:
 *
 * 1. Register User A (join, initial context)
 * 2. User A creates a thread
 * 3. User A creates a post in the thread
 * 4. User A casts an upvote (vote_type="up") for the post
 * 5. User A updates the vote to downvote (vote_type="down"). Should succeed.
 *    Validate vote is now "down".
 * 6. Register User B (context now User B)
 * 7. Attempt to update User A's vote as User B (vote_type="up"). Should fail
 *    with forbidden/permission error.
 */
export async function test_api_vote_update_by_owner_and_non_owner(
  connection: api.IConnection,
) {
  // 1. Register User A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAUsername = RandomGenerator.name();
  const userAPassword = RandomGenerator.alphaNumeric(12) + "A!1";
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      username: userAUsername,
      password: userAPassword,
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userA);

  // 2. User A creates a thread
  const threadTitle = RandomGenerator.paragraph({ sentences: 3 });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: threadTitle,
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. User A creates a post in the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. User A votes (upvote)
  const vote = await api.functional.discussionBoard.user.votes.create(
    connection,
    {
      body: {
        discussion_board_post_id: post.id,
        discussion_board_comment_id: null,
        vote_type: "up",
      } satisfies IDiscussionBoardVote.ICreate,
    },
  );
  typia.assert(vote);
  TestValidator.equals("vote_type is initially up", vote.vote_type, "up");

  // 5. User A updates vote to downvote
  const updatedVote = await api.functional.discussionBoard.user.votes.update(
    connection,
    {
      voteId: vote.id,
      body: {
        vote_type: "down",
      } satisfies IDiscussionBoardVote.IUpdate,
    },
  );
  typia.assert(updatedVote);
  TestValidator.equals(
    "vote_type changed to down",
    updatedVote.vote_type,
    "down",
  );

  // 6. Register User B (switch context)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBUsername = RandomGenerator.name();
  const userBPassword = RandomGenerator.alphaNumeric(12) + "B@2";
  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      username: userBUsername,
      password: userBPassword,
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userB);

  // 7. User B tries to update User A's vote (should fail)
  await TestValidator.error(
    "Non-owner cannot update other's vote",
    async () => {
      await api.functional.discussionBoard.user.votes.update(connection, {
        voteId: vote.id,
        body: {
          vote_type: "up",
        } satisfies IDiscussionBoardVote.IUpdate,
      });
    },
  );
}
