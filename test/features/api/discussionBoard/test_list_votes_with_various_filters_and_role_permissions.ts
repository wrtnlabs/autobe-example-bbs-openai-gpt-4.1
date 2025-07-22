import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";
import type { IPageIDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test paginated and filtered retrieval of votes with role-based permissions.
 *
 * This test validates the filtering, pagination, and access control behavior
 * of the admin/moderator vote-list endpoint for a discussion board.
 *
 * Steps:
 * 1. Create several member accounts for use as voters and test targets
 * 2. Create multiple vote types (e.g., upvote, downvote)
 * 3. Create threads (as the voter accounts)
 * 4. Cast votes: each member votes on different threads with different types
 * 5. As a privileged (admin/moderator) connection:
 *    a. Retrieve all votes (no filter): ensure all are returned
 *    b. Filter by voter_id: retrieves only that user's votes
 *    c. Filter by vote_type_id: returns correctly-typed votes
 *    d. Filter by thread_id: only votes for that thread
 *    e. Filter by non-existent voter_id (should return empty page)
 *    f. Filter by impossible/invalid parameter values (should error)
 *    g. Filter by date range: matches or misses
 *    h. Test pagination: check limited results and correct metadata
 * 6. Access as an unprivileged user is not tested as login endpoints are unavailable
 */
export async function test_api_discussionBoard_test_list_votes_with_various_filters_and_role_permissions(
  connection: api.IConnection,
) {
  // 1. Create several member accounts
  const voters = await Promise.all(
    ArrayUtil.repeat(3)(async () => {
      const member = await api.functional.discussionBoard.members.post(connection, {
        body: {
          username: RandomGenerator.alphabets(8),
          email: typia.random<string & tags.Format<"email">>(),
          hashed_password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
          profile_image_url: null,
        },
      });
      typia.assert(member);
      return member;
    })
  );

  // 2. Create vote types (e.g., upvote, downvote)
  const voteTypes = await Promise.all(
    ["upvote", "downvote"].map(async (code) => {
      const type = await api.functional.discussionBoard.voteTypes.post(connection, {
        body: {
          code,
          name: code.charAt(0).toUpperCase() + code.slice(1),
          description: `${code} type for tests`,
        },
      });
      typia.assert(type);
      return type;
    })
  );

  // 3. Create threads (each by a different member)
  const threads = await Promise.all(
    voters.map(async (voter, i) => {
      const thread = await api.functional.discussionBoard.threads.post(connection, {
        body: {
          discussion_board_member_id: voter.id,
          discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
          title: `Test thread ${i + 1}`,
          body: RandomGenerator.paragraph()(),
        },
      });
      typia.assert(thread);
      return thread;
    })
  );

  // 4. Cast votes with combinations: all voters vote on all threads/voteTypes
  const votes: IDiscussionBoardVote[] = [];
  for (const voter of voters) {
    for (const thread of threads) {
      for (const voteType of voteTypes) {
        // Simulate: voter votes with type on thread
        // (Connecting logic assumes permissions – no session change endpoint provided)
        const vote = await api.functional.discussionBoard.votes.post(connection, {
          body: {
            vote_type_id: voteType.id,
            thread_id: thread.id,
          },
        });
        typia.assert(vote);
        votes.push(vote);
      }
    }
  }

  // 5a. Retrieve all votes, paging default
  const allVotesPage = await api.functional.discussionBoard.votes.patch(connection, {
    body: {},
  });
  typia.assert(allVotesPage);
  TestValidator.predicate("retrieved votes exist and count >= test data")(
    allVotesPage.data.length >= votes.length
  );

  // 5b. Filter by voter_id
  const voter = voters[0];
  const voterVotes = await api.functional.discussionBoard.votes.patch(connection, {
    body: { voter_id: voter.id },
  });
  typia.assert(voterVotes);
  TestValidator.predicate("only this voter's votes returned")(
    voterVotes.data.every((v) => v.voter_id === voter.id)
  );

  // 5c. Filter by vote_type_id
  const voteType = voteTypes[0];
  const typeVotes = await api.functional.discussionBoard.votes.patch(connection, {
    body: { vote_type_id: voteType.id },
  });
  typia.assert(typeVotes);
  TestValidator.predicate("only given type's votes returned")(
    typeVotes.data.every((v) => v.vote_type_id === voteType.id)
  );

  // 5d. Filter by thread_id
  const thread = threads[0];
  const threadVotes = await api.functional.discussionBoard.votes.patch(connection, {
    body: { thread_id: thread.id },
  });
  typia.assert(threadVotes);
  TestValidator.predicate("only votes for this thread")(
    threadVotes.data.every((v) => v.thread_id === thread.id)
  );

  // 5e. Filter by non-existent voter_id (should return empty)
  const noVotesPage = await api.functional.discussionBoard.votes.patch(connection, {
    body: { voter_id: typia.random<string & tags.Format<"uuid">>() },
  });
  typia.assert(noVotesPage);
  TestValidator.equals("no votes returned for fake voter")(
    noVotesPage.data.length
  )(0);

  // 5f. Invalid parameter (e.g., page: negative number)
  await TestValidator.error("invalid page param should error")(
    async () =>
      await api.functional.discussionBoard.votes.patch(connection, {
        body: { page: -1 },
      })
  );

  // 5g. Date range filtering (created_from/to)
  const createdAt = votes[0].created_at;
  const afterVotes = await api.functional.discussionBoard.votes.patch(connection, {
    body: { created_from: createdAt },
  });
  typia.assert(afterVotes);
  TestValidator.predicate("all votes have created_at >= filter")(
    afterVotes.data.every(
      (v) => new Date(v.created_at).getTime() >= new Date(createdAt).getTime()
    )
  );

  // 5h. Pagination (limit=2, page=1)
  const pagedVotes = await api.functional.discussionBoard.votes.patch(connection, {
    body: { limit: 2, page: 1 },
  });
  typia.assert(pagedVotes);
  TestValidator.equals("pagination limit used")(
    pagedVotes.data.length
  )(Math.min(2, allVotesPage.pagination.records));
  TestValidator.equals("current page is 1")(
    pagedVotes.pagination.current
  )(1);
}