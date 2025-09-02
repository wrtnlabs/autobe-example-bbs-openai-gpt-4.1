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
 * Validate that a user cannot update their poll vote in a poll that is
 * closed to modification.
 *
 * This test covers the following workflow:
 *
 * 1. Register a new user (for isolation)
 * 2. Create a discussion thread
 * 3. Create a post within the thread
 * 4. Create a poll attached to the post (single-choice, open on creation)
 * 5. The user votes in the poll
 * 6. The poll is closed by updating closed_at to a past datetime
 * 7. The user attempts to update their vote after poll closure
 * 8. Verify that the update attempt fails with an appropriate error
 *    (forbidden)
 *
 * NOTE: The API set does not expose explicit poll option creation/query
 * endpoints. This test uses a randomly generated UUID for poll option
 * selection, as a placeholder. In a real-case, the poll options' actual
 * UUIDs should be used.
 */
export async function test_api_poll_vote_update_invalid_forbidden(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const password = RandomGenerator.alphaNumeric(12) + "A!1";
  const displayName = RandomGenerator.name();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Create a discussion thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create a post within the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create a poll attached to the post (single-choice, open now)
  const now = new Date();
  const openedAt = now.toISOString();
  const closedAt = null;
  const poll = await api.functional.discussionBoard.user.posts.polls.create(
    connection,
    {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        multi_choice: false,
        opened_at: openedAt,
        closed_at: closedAt,
      } satisfies IDiscussionBoardPoll.ICreate,
    },
  );
  typia.assert(poll);

  // ---- SIMULATION/ADAPTATION: We do not have a poll option creation endpoint in the API set, so this test uses a random UUID as a fake optionId. Replace this with actual poll option IDs when such endpoints are available.
  const fakeOptionId = typia.random<string & tags.Format<"uuid">>();

  // 5. User votes in the poll
  const pollVote =
    await api.functional.discussionBoard.user.polls.pollVotes.create(
      connection,
      {
        pollId: poll.id,
        body: {
          pollId: poll.id,
          optionIds: [fakeOptionId],
        } satisfies IDiscussionBoardPollVote.ICreate,
      },
    );
  typia.assert(pollVote);

  // 6. Close the poll by updating closed_at to a past time
  const closedPast = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const closedPoll =
    await api.functional.discussionBoard.user.posts.polls.update(connection, {
      postId: post.id,
      pollId: poll.id,
      body: {
        closed_at: closedPast,
      } satisfies IDiscussionBoardPoll.IUpdate,
    });
  typia.assert(closedPoll);

  // 7. Attempt to update the poll vote after closure (forbidden)
  await TestValidator.error(
    "update poll vote after closure is forbidden",
    async () => {
      await api.functional.discussionBoard.user.polls.pollVotes.update(
        connection,
        {
          pollId: poll.id,
          pollVoteId: pollVote.id,
          body: {
            pollVoteId: pollVote.id,
            newOptionIds: [fakeOptionId],
          } satisfies IDiscussionBoardPollVote.IUpdate,
        },
      );
    },
  );
}
