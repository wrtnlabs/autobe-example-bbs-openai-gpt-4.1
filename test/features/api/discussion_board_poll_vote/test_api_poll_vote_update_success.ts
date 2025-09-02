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
 * Test poll vote updating (happy path): ensures users can update their vote
 * on a poll where vote modification is allowed.
 *
 * Business flow:
 *
 * 1. Register a standard user (consent, unique email/username)
 * 2. Create a thread as the user
 * 3. Create a post in the thread
 * 4. Attach a poll to the post (with at least two poll options)
 * 5. Cast an initial vote for the first option
 * 6. Update the poll vote to select the second option
 * 7. Assert that the updated vote record reflects the new option (correct poll
 *    id and user id, no errors)
 *
 * This E2E test covers the full cycle from registration to vote update
 * validation. Note: Poll option creation is not exposed in API/DTO; options
 * are simulated for test purposes and assertions are on vote PKs.
 */
export async function test_api_poll_vote_update_success(
  connection: api.IConnection,
) {
  // 1. Register user (join)
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name().replace(/\s/g, "_") + Date.now();
  const password = RandomGenerator.alphaNumeric(12) + "Aa$1";
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
  const userId = user.user.id;

  // 2. Create a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
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
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Attach poll to post (with at least two options, simulated for test)
  const now = new Date();
  const nowUtc = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000,
  ).toISOString();
  const pollTitle = RandomGenerator.paragraph({ sentences: 2 });
  const pollDescription = RandomGenerator.paragraph({ sentences: 4 });
  const poll = await api.functional.discussionBoard.user.posts.polls.create(
    connection,
    {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        title: pollTitle,
        description: pollDescription,
        multi_choice: false,
        opened_at: nowUtc,
        closed_at: null,
      } satisfies IDiscussionBoardPoll.ICreate,
    },
  );
  typia.assert(poll);

  // Simulate poll options as two UUIDs linked to this poll (API/DTO for options missing)
  const fakeOptionIds: (string & tags.Format<"uuid">)[] = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  // 5. User votes for first option
  const vote = await api.functional.discussionBoard.user.polls.pollVotes.create(
    connection,
    {
      pollId: poll.id,
      body: {
        pollId: poll.id,
        optionIds: [fakeOptionIds[0]],
      } satisfies IDiscussionBoardPollVote.ICreate,
    },
  );
  typia.assert(vote);
  TestValidator.equals(
    "vote is for first option",
    vote.discussion_board_poll_option_id,
    fakeOptionIds[0],
  );
  TestValidator.equals(
    "vote references correct poll",
    vote.discussion_board_poll_id,
    poll.id,
  );
  TestValidator.equals(
    "vote references correct user",
    vote.discussion_board_user_id,
    userId,
  );

  // 6. Update vote to select second option
  const updatedVote =
    await api.functional.discussionBoard.user.polls.pollVotes.update(
      connection,
      {
        pollId: poll.id,
        pollVoteId: vote.id,
        body: {
          pollVoteId: vote.id,
          newOptionIds: [fakeOptionIds[1]],
        } satisfies IDiscussionBoardPollVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  TestValidator.equals(
    "updated vote points to new option",
    updatedVote.discussion_board_poll_option_id,
    fakeOptionIds[1],
  );
  TestValidator.equals(
    "updated vote still references correct poll",
    updatedVote.discussion_board_poll_id,
    poll.id,
  );
  TestValidator.equals(
    "updated vote still references user",
    updatedVote.discussion_board_user_id,
    userId,
  );
  TestValidator.notEquals(
    "updated vote option id differs from original",
    updatedVote.discussion_board_poll_option_id,
    vote.discussion_board_poll_option_id,
  );
}
