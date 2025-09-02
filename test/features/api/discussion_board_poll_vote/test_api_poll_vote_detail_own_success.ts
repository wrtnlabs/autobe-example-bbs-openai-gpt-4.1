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
 * Validate that a user can successfully retrieve their own poll vote
 * detail.
 *
 * This test simulates the full lifecycle of a self-owned poll vote:
 *
 * 1. Register a new user and establish authentication context
 * 2. Create a discussion thread as that user
 * 3. Create a post in the thread
 * 4. Attach a poll to the post (single-choice)
 * 5. Simulate a poll option (SDK does not expose poll option creation, so we
 *    use a generated UUID)
 * 6. Vote in the poll as the user
 * 7. Retrieve the vote detail via GET
 *    /discussionBoard/user/polls/{pollId}/pollVotes/{pollVoteId}
 * 8. Assert that all relevant fields match, ownership is correct, and no
 *    extraneous vote data is leaked
 */
export async function test_api_poll_vote_detail_own_success(
  connection: api.IConnection,
) {
  // 1. Register a new user and establish context
  const registerResponse = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name().replace(/\s+/g, "_"),
      password: RandomGenerator.alphaNumeric(12) + "Aa!1",
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(registerResponse);

  // 2. Create a discussion thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Add a post to the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 9,
          wordMin: 3,
          wordMax: 7,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Attach a poll to the post
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const poll = await api.functional.discussionBoard.user.posts.polls.create(
    connection,
    {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        multi_choice: false,
        opened_at: now.toISOString(),
        closed_at: nextWeek.toISOString(),
      } satisfies IDiscussionBoardPoll.ICreate,
    },
  );
  typia.assert(poll);

  // 5. Simulate a poll option (no poll option API exposed; we assume the poll has one default option that we generate for test)
  const pollOptionId = typia.random<string & tags.Format<"uuid">>();

  // 6. Vote in the poll as the user
  const vote = await api.functional.discussionBoard.user.polls.pollVotes.create(
    connection,
    {
      pollId: poll.id,
      body: {
        pollId: poll.id,
        optionIds: [pollOptionId],
      } satisfies IDiscussionBoardPollVote.ICreate,
    },
  );
  typia.assert(vote);

  // 7. Retrieve the vote detail
  const got = await api.functional.discussionBoard.user.polls.pollVotes.at(
    connection,
    {
      pollId: poll.id,
      pollVoteId: vote.id,
    },
  );
  typia.assert(got);

  // 8. Assert match of all fields and business logic
  TestValidator.equals("vote id matches after retrieval", got.id, vote.id);
  TestValidator.equals(
    "poll id matches after retrieval",
    got.discussion_board_poll_id,
    poll.id,
  );
  TestValidator.equals(
    "user id matches after retrieval",
    got.discussion_board_user_id,
    registerResponse.user.id,
  );
  TestValidator.equals(
    "option id matches after retrieval",
    got.discussion_board_poll_option_id,
    pollOptionId,
  );
  TestValidator.predicate(
    "vote creation timestamp is ISO date-time",
    typeof got.created_at === "string" &&
      !!got.created_at.match(/^\d{4}-\d{2}-\d{2}T/),
  );
  TestValidator.equals("vote not soft-deleted", got.deleted_at, null);
}
