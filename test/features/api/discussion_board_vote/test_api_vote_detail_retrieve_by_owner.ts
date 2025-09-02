import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * Test that a user can retrieve their own vote's detail.
 *
 * This function verifies the end-to-end process for retrieving a vote's
 * detail by its owner. The test covers a realistic workflow: registering a
 * test user, creating a thread, posting in it, casting a vote, and fetching
 * the vote using its ID. It validates entity closures
 * (user/thread/post/vote), ownership enforcement, linkage of returned data,
 * and correct data formats for all fields.
 *
 * Steps:
 *
 * 1. Register user (and get authorization)
 * 2. Create thread as the user
 * 3. Create post in the thread
 * 4. Cast vote on the post
 * 5. Retrieve vote by ID (assert correctness of response)
 */
export async function test_api_vote_detail_retrieve_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate test user
  const userInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: "TestPwd!2345678",
    consent: true,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardUser.ICreate;
  const userAuth = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(userAuth);
  const userId = userAuth.user.id;

  // 2. Create thread as this user
  const threadInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardThread.ICreate;
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    { body: threadInput },
  );
  typia.assert(thread);
  TestValidator.equals(
    "thread belongs to creator",
    thread.created_by_id,
    userId,
  );

  // 3. Create a post in the thread
  const postInput = {
    thread_id: thread.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
  } satisfies IDiscussionBoardPost.ICreate;
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    { threadId: thread.id, body: postInput },
  );
  typia.assert(post);
  TestValidator.equals("post belongs to thread", post.thread_id, thread.id);
  TestValidator.equals("post created by user", post.created_by_id, userId);

  // 4. Cast a vote on the post
  const voteInput = {
    discussion_board_post_id: post.id,
    discussion_board_comment_id: null, // voting on post (not comment)
    vote_type: RandomGenerator.pick(["up", "down"] as const),
  } satisfies IDiscussionBoardVote.ICreate;
  const vote = await api.functional.discussionBoard.user.votes.create(
    connection,
    { body: voteInput },
  );
  typia.assert(vote);
  TestValidator.equals(
    "vote is for correct post",
    vote.discussion_board_post_id,
    post.id,
  );
  TestValidator.equals(
    "vote_type matches input",
    vote.vote_type,
    voteInput.vote_type,
  );
  TestValidator.predicate(
    "vote timestamps valid",
    typeof vote.created_at === "string" && typeof vote.updated_at === "string",
  );

  // 5. Retrieve the vote by its id
  const detailed = await api.functional.discussionBoard.user.votes.at(
    connection,
    { voteId: vote.id },
  );
  typia.assert(detailed);
  TestValidator.equals("vote id matches", detailed.id, vote.id);
  TestValidator.equals(
    "vote post id matches",
    detailed.discussion_board_post_id,
    post.id,
  );
  TestValidator.equals("vote_type matches", detailed.vote_type, vote.vote_type);
  TestValidator.equals(
    "created_at matches",
    detailed.created_at,
    vote.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    detailed.updated_at,
    vote.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    detailed.deleted_at,
    vote.deleted_at,
  );
}
