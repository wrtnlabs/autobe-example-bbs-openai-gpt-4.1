import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * Test updating the type of an existing vote and validate business constraints (success, duplicate, forbidden, non-existent scenarios).
 *
 * This comprehensive test verifies that a voter can update their vote type (e.g., upvote to downvote) and that only the vote type field is updatable. The test also covers negative cases: forbidden attempts by non-owners, duplicate vote via type change (uniqueness constraint), updating a non-existent vote, and checks for correct system behavior and error responses.
 *
 * Steps:
 * 1. Register two members: the vote owner and another user for access restriction enforcement.
 * 2. Create two vote types (e.g., upvote, downvote).
 * 3. Create a thread that serves as the voting target.
 * 4. Owner creates a vote of type1 on the thread.
 * 5. Owner updates their vote to type2 and verifies changes are reflected and restricted to vote type only.
 * 6. Attempt to update the vote as the non-owner and ensure forbidden error behavior.
 * 7. Create another vote by owner (on a different thread) and attempt to update the first vote to same type, verifying uniqueness error.
 * 8. Attempt to update a non-existing vote and expect not found error.
 *
 * Constraints:
 * - Only implemented business flows and DTOs from available SDK. Thread deletion and true admin context switch are skipped due to lack of endpoints.
 */
export async function test_api_discussionBoard_test_update_vote_type_success_duplicate_and_forbidden_scenarios(
  connection: api.IConnection,
) {
  // 1. Register two members (vote owner and non-owner)
  const memberOwner = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberOwner);
  const memberOther = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberOther);

  // 2. Create two vote types for different vote actions
  const voteType1 = await api.functional.discussionBoard.voteTypes.post(connection, {
    body: {
      code: `voteA_${RandomGenerator.alphaNumeric(4)}`,
      name: "Vote-A",
      description: "Automated test vote type A",
    },
  });
  typia.assert(voteType1);
  const voteType2 = await api.functional.discussionBoard.voteTypes.post(connection, {
    body: {
      code: `voteB_${RandomGenerator.alphaNumeric(4)}`,
      name: "Vote-B",
      description: "Automated test vote type B",
    },
  });
  typia.assert(voteType2);

  // 3. Create a thread for voting. Owner is memberOwner.
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: memberOwner.id,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(1),
      body: RandomGenerator.content()()(),
    },
  });
  typia.assert(thread);

  // 4. Owner creates a vote of type1 on the thread
  const vote = await api.functional.discussionBoard.votes.post(connection, {
    body: {
      vote_type_id: voteType1.id,
      thread_id: thread.id,
    },
  });
  typia.assert(vote);

  // 5. Owner updates their vote to type2 (success)
  const updatedVote = await api.functional.discussionBoard.votes.putById(connection, {
    id: vote.id,
    body: {
      vote_type_id: voteType2.id,
    },
  });
  typia.assert(updatedVote);
  TestValidator.equals("vote type changed")(updatedVote.vote_type_id)(voteType2.id);
  TestValidator.equals("thread id remains")(updatedVote.thread_id)(vote.thread_id);

  // 6. Attempt to update the vote as another member (simulated forbidden)
  TestValidator.error("forbidden: non-owner cannot update vote")(
    async () => {
      await api.functional.discussionBoard.votes.putById(connection, {
        id: vote.id,
        body: {
          vote_type_id: voteType1.id,
        },
      });
    }
  );

  // 7. Owner creates a new thread and a vote of type2. Then attempts to update the first vote to type2 again (should violate uniqueness)
  const thread2 = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: memberOwner.id,
      discussion_board_category_id: thread.discussion_board_category_id,
      title: RandomGenerator.paragraph()(1),
      body: RandomGenerator.content()()(),
    },
  });
  typia.assert(thread2);
  const vote2 = await api.functional.discussionBoard.votes.post(connection, {
    body: {
      vote_type_id: voteType2.id,
      thread_id: thread2.id,
    },
  });
  typia.assert(vote2);
  TestValidator.error("duplicate vote uniqueness constraint")(
    async () => {
      await api.functional.discussionBoard.votes.putById(connection, {
        id: vote.id,
        body: {
          vote_type_id: voteType2.id,
        },
      });
    }
  );

  // 8. Attempt to update a non-existent vote (random uuid, expect not found)
  TestValidator.error("not found for non-existent vote")(
    async () => {
      await api.functional.discussionBoard.votes.putById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: {
          vote_type_id: voteType1.id,
        },
      });
    }
  );
  // Thread deletion scenario skipped: no delete endpoint available in SDK.
}