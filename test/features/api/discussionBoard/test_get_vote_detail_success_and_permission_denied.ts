import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * Validate vote detail retrieval and owner-only permissions for specific vote record.
 *
 * Scenario ensures that the member who creates a vote is able to retrieve its details
 * via /discussionBoard/votes/{id}. Limitations: as the SDK and DTOs provide no authentication or
 * per-role APIs, this test cannot switch between different member roles, nor validate admin/moderator
 * or unrelated member permission denial. This test focuses on the setup, correct creation, and retrieval
 * of a vote by its owning member as permitted by available endpoints.
 *
 * Steps:
 * 1. Register a member (as vote owner)
 * 2. Create a vote type
 * 3. Create a thread owned by the member
 * 4. Cast a vote by the member on the thread
 * 5. Retrieve the vote by its ID and verify content matches creation
 */
export async function test_api_discussionBoard_test_get_vote_detail_success_and_permission_denied(
  connection: api.IConnection,
) {
  // 1. Register member (vote owner)
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Create vote type
  const voteType = await api.functional.discussionBoard.voteTypes.post(connection, {
    body: {
      code: RandomGenerator.alphaNumeric(6),
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph()(),
    } satisfies IDiscussionBoardVoteType.ICreate,
  });
  typia.assert(voteType);

  // 3. Create thread by member
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: member.id,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(),
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 4. Cast vote by member
  const vote = await api.functional.discussionBoard.votes.post(connection, {
    body: {
      vote_type_id: voteType.id,
      thread_id: thread.id,
      post_id: null,
      comment_id: null,
    } satisfies IDiscussionBoardVote.ICreate,
  });
  typia.assert(vote);

  // 5. Retrieve the vote by ID
  const retrieved = await api.functional.discussionBoard.votes.getById(connection, {
    id: vote.id,
  });
  typia.assert(retrieved);
  TestValidator.equals("vote record content matches")(retrieved)({
    id: vote.id,
    voter_id: vote.voter_id,
    vote_type_id: vote.vote_type_id,
    thread_id: vote.thread_id,
    post_id: vote.post_id,
    comment_id: vote.comment_id,
    created_at: vote.created_at,
    updated_at: vote.updated_at,
  });
}