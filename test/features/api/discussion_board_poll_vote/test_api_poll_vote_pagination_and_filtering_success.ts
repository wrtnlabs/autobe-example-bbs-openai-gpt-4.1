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
import type { IPageIDiscussionBoardPollVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPollVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate successful pagination and filtering of poll votes for an open
 * poll.
 *
 * This test simulates the full flow: registering several users, creating a
 * thread/post/poll, registering multiple votes from different users, and
 * then verifies paginated vote retrieval with various filters using PATCH
 * /discussionBoard/user/polls/{pollId}/pollVotes. The test ensures:
 *
 * - Only visible, active votes are returned (deleted_at is null)
 * - Pagination info is accurate (page, limit, records, pages)
 * - Filtering by poll_option_id (option), user_id, and simulated date range
 *   works as expected
 * - Votes returned correspond to the correct poll and user selection
 * - Endpoint behaves properly when called as a poll participant
 */
export async function test_api_poll_vote_pagination_and_filtering_success(
  connection: api.IConnection,
) {
  // 1. Register main user (thread creator) and collect account info
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorUsername = RandomGenerator.name();
  const creatorAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: creatorEmail,
      username: creatorUsername,
      password: "Password123!",
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(creatorAuth);

  // 2. Register multiple voter accounts
  const voterAccounts = await ArrayUtil.asyncRepeat(4, async () => {
    const email = typia.random<string & tags.Format<"email">>();
    const username = RandomGenerator.name();
    const auth = await api.functional.auth.user.join(connection, {
      body: {
        email,
        username,
        password: "Password123!",
        consent: true,
        display_name: RandomGenerator.name(1),
      } satisfies IDiscussionBoardUser.ICreate,
    });
    typia.assert(auth);
    return { auth, email, username };
  });

  // 3. Creator creates a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 4. Creator creates a post in the new thread
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

  // 5. Creator creates a poll on the post
  // Simulate three poll options (UUIDs), as options are not separately modeled; in reality, these would be from poll options API
  const pollOptions = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const now = new Date();
  const poll = await api.functional.discussionBoard.user.posts.polls.create(
    connection,
    {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        multi_choice: false,
        opened_at: now.toISOString(),
        closed_at: null,
      } satisfies IDiscussionBoardPoll.ICreate,
    },
  );
  typia.assert(poll);

  // 6. Each voter logs in and votes in the poll
  const pollVotes = [];
  for (let i = 0; i < voterAccounts.length; ++i) {
    await api.functional.auth.user.join(connection, {
      body: {
        email: voterAccounts[i].email,
        username: voterAccounts[i].username,
        password: "Password123!",
        consent: true,
        display_name: RandomGenerator.name(1),
      } satisfies IDiscussionBoardUser.ICreate,
    });
    // Select a poll option by round robin
    const optionId = pollOptions[i % pollOptions.length];
    const vote =
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
    typia.assert(vote);
    pollVotes.push({ vote, optionId, userId: voterAccounts[i].auth.user.id });
  }

  // 7. Use a voter to retrieve votes with various filters
  const searcherIdx = 1;
  await api.functional.auth.user.join(connection, {
    body: {
      email: voterAccounts[searcherIdx].email,
      username: voterAccounts[searcherIdx].username,
      password: "Password123!",
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });

  // (A) Retrieve votes filtered by poll_option_id
  const testOptionId = pollVotes[searcherIdx].optionId;
  const votesByOption =
    await api.functional.discussionBoard.user.polls.pollVotes.index(
      connection,
      {
        pollId: poll.id,
        body: {
          poll_option_id: testOptionId,
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardPollVote.IRequest,
      },
    );
  typia.assert(votesByOption);
  TestValidator.predicate(
    "all votes are for searched poll option",
    votesByOption.data.every(
      (v) => v.discussion_board_poll_option_id === testOptionId,
    ),
  );
  TestValidator.equals(
    "pagination reflects correct records count for poll option filter",
    votesByOption.pagination.records,
    votesByOption.data.length,
  );

  // (B) Retrieve votes filtered by user_id
  const testUserId = pollVotes[searcherIdx].userId;
  const votesByUser =
    await api.functional.discussionBoard.user.polls.pollVotes.index(
      connection,
      {
        pollId: poll.id,
        body: {
          user_id: testUserId,
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardPollVote.IRequest,
      },
    );
  typia.assert(votesByUser);
  TestValidator.predicate(
    "all votes are by searched user",
    votesByUser.data.every((v) => v.discussion_board_user_id === testUserId),
  );

  // (C) Retrieve votes with simulated date range (by filtering after fetch, since API doesn't support direct date range parametrization)
  const createdAtList = pollVotes.map((p) => p.vote.created_at).sort();
  const fromDate = createdAtList[1];
  const toDate = createdAtList[3];
  const votesByDateRange =
    await api.functional.discussionBoard.user.polls.pollVotes.index(
      connection,
      {
        pollId: poll.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardPollVote.IRequest,
      },
    );
  typia.assert(votesByDateRange);
  TestValidator.predicate(
    "all votes created_at are in expected range (simulated)",
    votesByDateRange.data.every(
      (v) => v.created_at >= fromDate && v.created_at <= toDate,
    ),
  );

  // (D) Pagination edge: limit = 2
  const pagedVotes =
    await api.functional.discussionBoard.user.polls.pollVotes.index(
      connection,
      {
        pollId: poll.id,
        body: {
          page: 1,
          limit: 2,
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardPollVote.IRequest,
      },
    );
  typia.assert(pagedVotes);
  TestValidator.equals(
    "pagination page size equals limit",
    pagedVotes.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination does not exceed max available records",
    pagedVotes.data.length <= 2,
  );

  // By default, only non-deleted votes should appear
  TestValidator.predicate(
    "all votes are non-deleted (deleted_at is null)",
    pagedVotes.data.every(
      (v) => v.deleted_at === null || v.deleted_at === undefined,
    ),
  );
}
