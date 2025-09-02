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
 * Ensure that duplicate voting for the same option is forbidden in
 * single-choice polls.
 *
 * This test:
 *
 * 1. Registers a user (ensures authentication context is present for all
 *    subsequent operations)
 * 2. Creates a thread as the user
 * 3. Adds a post to the thread
 * 4. Creates a new poll on the post (single-choice, not multi-choice)
 *
 *    - The test simulates poll options by generating UUIDs since actual option
 *         APIs are not exposed
 * 5. Submits the first vote for a generated option (should succeed)
 * 6. Attempts to submit a second vote for the same option (should fail with a
 *    business error/duplicate constraint)
 *
 * This test asserts the business rule that users can only vote once for the
 * same option in a single-choice poll.
 *
 * Note: Since poll option DTOs/endpoints are not available, option UUIDs
 * are simulated. In a real environment, poll option IDs would be fetched
 * from the poll creation/listing APIs.
 */
export async function test_api_poll_vote_create_duplicate_forbidden(
  connection: api.IConnection,
) {
  // 1. Register user (establishes authentication context)
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();

  const registerResp = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password: "Str0ngP@ssword!",
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(registerResp);

  // 2. Create thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 12,
        }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create post on the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Create a poll (single-choice) – simulate poll options as we lack poll options API
  const poll = await api.functional.discussionBoard.user.posts.polls.create(
    connection,
    {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 12,
        }),
        multi_choice: false, // single-choice poll
        opened_at: new Date().toISOString(),
      } satisfies IDiscussionBoardPoll.ICreate,
    },
  );
  typia.assert(poll);

  // Option ID simulation (since no poll options API is present)
  const optionId = typia.random<string & tags.Format<"uuid">>();

  // 5. First vote: should succeed
  const vote = await api.functional.discussionBoard.user.polls.pollVotes.create(
    connection,
    {
      pollId: poll.id,
      body: {
        pollId: poll.id,
        optionIds: [optionId],
      } satisfies IDiscussionBoardPollVote.ICreate,
    },
  );
  typia.assert(vote);

  // 6. Attempt duplicate vote for the same option – should fail
  await TestValidator.error(
    "duplicate vote triggers business error",
    async () => {
      await api.functional.discussionBoard.user.polls.pollVotes.create(
        connection,
        {
          pollId: poll.id,
          body: {
            pollId: poll.id,
            optionIds: [optionId],
          } satisfies IDiscussionBoardPollVote.ICreate,
        },
      );
    },
  );
}
