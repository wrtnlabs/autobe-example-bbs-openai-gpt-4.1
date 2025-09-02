import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";
import type { IDiscussionBoardPollVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollVote";

/**
 * Validate that a user cannot access the poll vote details of another user.
 *
 * This test ensures that poll votes are private to each user by checking
 * that an authenticated user cannot access the voting record of another
 * account. This confirms compliance with privacy best practices and
 * prevents leaking sensitive poll participation data.
 *
 * Workflow:
 *
 * 1. Register the first user and authenticate (user1).
 * 2. User1 creates a new thread.
 * 3. User1 creates a post within the thread.
 * 4. User1 attaches a poll to this post (single-choice).
 * 5. User1 votes in the poll (creating a pollVoteId belonging to user1).
 * 6. Register a second user (user2) and authenticate (now context is user2).
 * 7. User2 attempts to fetch user1's pollVote detail. Expect forbidden (403)
 *    or not found (404).
 */
export async function test_api_poll_vote_detail_other_user_forbidden(
  connection: api.IConnection,
) {
  // 1. Register the first user (user1)
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Username = RandomGenerator.name();
  const user1Password = RandomGenerator.alphaNumeric(12) + "!";
  const user1Result = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Username,
      password: user1Password,
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user1Result);

  // 2. User1 creates a discussion thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. User1 creates a post in the thread
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

  // 4. User1 creates a poll attached to the post
  const now = new Date();
  const poll = await api.functional.discussionBoard.user.posts.polls.create(
    connection,
    {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        multi_choice: false,
        opened_at: now.toISOString() as string & tags.Format<"date-time">,
        closed_at: null,
      } satisfies IDiscussionBoardPoll.ICreate,
    },
  );
  typia.assert(poll);

  // 5. User1 votes in the created poll
  // Since option creation API is not exposed, create a random UUID as a poll option id for demonstration
  const pollOptionId = typia.random<string & tags.Format<"uuid">>();
  const pollVote =
    await api.functional.discussionBoard.user.polls.pollVotes.create(
      connection,
      {
        pollId: poll.id,
        body: {
          pollId: poll.id,
          optionIds: [pollOptionId],
        } satisfies IDiscussionBoardPollVote.ICreate,
      },
    );
  typia.assert(pollVote);
  const pollVoteId = pollVote.id;
  typia.assert<string & tags.Format<"uuid">>(pollVoteId);

  // 6. Register second user (user2)
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.name();
  const user2Password = RandomGenerator.alphaNumeric(14) + "#";
  const user2Result = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Username,
      password: user2Password,
      display_name: RandomGenerator.name(1),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user2Result);

  // 7. User2 tries to access user1's pollVote detail; must get error (403/404)
  await TestValidator.error(
    "forbid poll vote detail access of other user",
    async () => {
      await api.functional.discussionBoard.user.polls.pollVotes.at(connection, {
        pollId: poll.id,
        pollVoteId,
      });
    },
  );
}
