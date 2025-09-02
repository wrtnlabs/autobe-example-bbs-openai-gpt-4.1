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
 * Test successful voting flow in a discussion board poll:
 *
 * 1. Register a new user for authentication context.
 * 2. Create a discussion thread as the user.
 * 3. Post a message within the thread.
 * 4. Attach a new poll to the post (note: poll options management is not
 *    exposed via available API/DTOs, so poll option selection is
 *    simulated).
 * 5. Vote in the poll for a simulated valid option ID (due to API/DTO
 *    limitations).
 * 6. Validate:
 *
 *    - The vote is recorded and returned from the API (type check & reference
 *         check)
 *    - The vote record references the correct poll and option
 *    - Optionally, other logic if further API access/DTOs are present.
 */
export async function test_api_poll_vote_create_success(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const result = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password: "TestPassword1!",
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(result);

  // 2. Create a discussion thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
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
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Attach a poll to the post (Note: poll options are not handled through available DTOs/APIs, so cannot manage options explicitly)
  const pollData: IDiscussionBoardPoll.ICreate = {
    discussion_board_post_id: post.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    multi_choice: false, // single-choice poll
    opened_at: new Date().toISOString(),
  };
  const poll = await api.functional.discussionBoard.user.posts.polls.create(
    connection,
    {
      postId: post.id,
      body: pollData,
    },
  );
  typia.assert(poll);

  // 5. Submit a vote: Simulate with poll.id as the only option (no real option IDs available in exposed DTOs)
  const optionId = poll.id; // Placeholder due to limitations; see note above
  const voteInput: IDiscussionBoardPollVote.ICreate = {
    pollId: poll.id,
    optionIds: [optionId],
  };
  const vote = await api.functional.discussionBoard.user.polls.pollVotes.create(
    connection,
    {
      pollId: poll.id,
      body: voteInput,
    },
  );
  typia.assert(vote);

  // 6. Validate the vote record
  TestValidator.equals(
    "vote references correct poll",
    vote.discussion_board_poll_id,
    poll.id,
  );
  TestValidator.equals(
    "vote references correct option",
    vote.discussion_board_poll_option_id,
    optionId,
  );
}
