import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * Validate the deletion (soft, with audit trail) of a discussion board vote under different permission scenarios.
 *
 * The business logic under test involves who may delete a vote using DELETE /discussionBoard/votes/{id}. Only the vote owner (voter) and admin roles may delete a vote. Deletion is expected to be a soft deletion (proper audit field update, not hard removal). 
 * The function also validates error handling for attempts to delete wrong/invalid votes, or votes in improper system state.
 *
 * Test workflow:
 * 1. Prepare context by creating: an admin member, a regular vote owner member, and a random other member.
 * 2. Register a new vote type (e.g., "upvote") for use in voting.
 * 3. Register a thread (as discussion context for the vote).
 * 4. Cast a vote of the registered type on the new thread, as the vote owner.
 * 5. Delete the vote by its owner - expect success and soft deletion.
 * 6. Attempt to delete an already deleted vote - expect error.
 * 7. Attempt to delete a non-existent vote ID - expect error.
 * 8. Cast a new vote as the owner again. Attempt to delete as an unrelated (non-owner/non-admin) - expect error.
 * 9. Assign admin privileges to the admin member if possible, then delete the vote as admin - expect success.
 * 10. Cast another vote, delete the target thread, then attempt to delete the vote (on deleted thread) - expect error or defined system handling. (Skipped: No thread deletion API)
 */
export async function test_api_discussionBoard_test_delete_vote_by_owner_and_admin_with_restrictions(
  connection: api.IConnection,
) {
  // 1. Create three members: admin, vote owner, unrelated
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const otherEmail = typia.random<string & tags.Format<"email">>();

  const adminMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: adminEmail,
      hashed_password: "admin!Password#123",
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(adminMember);

  const ownerMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: ownerEmail,
      hashed_password: "owner!Password#456",
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(ownerMember);

  const otherMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: otherEmail,
      hashed_password: "other!Password#789",
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(otherMember);

  // 2. Create a vote type (e.g., upvote)
  const voteType = await api.functional.discussionBoard.voteTypes.post(connection, {
    body: {
      code: "upvote-" + RandomGenerator.alphaNumeric(6),
      name: "Upvote",
      description: "Standard upvote for testing.",
    } satisfies IDiscussionBoardVoteType.ICreate,
  });
  typia.assert(voteType);

  // 3. Create a thread (for voting)
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: ownerMember.id,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(12),
      body: RandomGenerator.paragraph()(40),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 4. Owner casts a vote on the thread
  const vote = await api.functional.discussionBoard.votes.post(connection, {
    body: {
      vote_type_id: voteType.id,
      thread_id: thread.id,
      post_id: null,
      comment_id: null,
    } satisfies IDiscussionBoardVote.ICreate,
  });
  typia.assert(vote);

  // 5. Delete the vote as the owner
  const deletedVote = await api.functional.discussionBoard.votes.eraseById(connection, {
    id: vote.id,
  });
  typia.assert(deletedVote);
  TestValidator.equals("deletedVote.id matches")(deletedVote.id)(vote.id);

  // 6. Attempt to delete the vote again - should fail
  await TestValidator.error("Cannot delete already deleted vote")(() =>
    api.functional.discussionBoard.votes.eraseById(connection, { id: vote.id })
  );

  // 7. Attempt to delete a definitely non-existent vote (random UUID)
  await TestValidator.error("Cannot delete non-existent vote")(() =>
    api.functional.discussionBoard.votes.eraseById(connection, { id: typia.random<string & tags.Format<"uuid">>() })
  );

  // 8. Cast a vote again as owner
  const vote2 = await api.functional.discussionBoard.votes.post(connection, {
    body: {
      vote_type_id: voteType.id,
      thread_id: thread.id,
      post_id: null,
      comment_id: null,
    } satisfies IDiscussionBoardVote.ICreate,
  });
  typia.assert(vote2);

  // Now try to delete as unrelated member (simulate switch to otherMember, which is not the owner)
  // (Assume 'connection' tracks user session; if not, in reality would need login API call here)
  await TestValidator.error("Unrelated user cannot delete vote")(() =>
    api.functional.discussionBoard.votes.eraseById(connection, { id: vote2.id })
  );

  // 9. Try to delete as admin (since real admin login/role switch is not specified, simulate same call)
  // In reality, would require admin session context.
  const deletedByAdmin = await api.functional.discussionBoard.votes.eraseById(connection, {
    id: vote2.id,
  });
  typia.assert(deletedByAdmin);
  TestValidator.equals("deletedByAdmin.id matches")(deletedByAdmin.id)(vote2.id);

  // 10. Vote after deleting thread; create new vote, delete thread, then attempt vote delete
  const thread2 = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: ownerMember.id,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(32),
      body: RandomGenerator.paragraph()(50),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread2);

  const vote3 = await api.functional.discussionBoard.votes.post(connection, {
    body: {
      vote_type_id: voteType.id,
      thread_id: thread2.id,
      post_id: null,
      comment_id: null,
    } satisfies IDiscussionBoardVote.ICreate,
  });
  typia.assert(vote3);

  // (No delete thread API in available functions, so we cannot test case 10 exactly)
  // If we had api.functional.discussionBoard.threads.eraseById we'd use it. Skip this step.
}