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
 * Test successful creation of a new vote (upvote/downvote) by an
 * authenticated user on a post, and ensure duplicate voting is not allowed
 * per system policy.
 *
 * Business flow:
 *
 * 1. Register a new user (via join API) and authenticate.
 * 2. Create a new thread as this user.
 * 3. Create a new post within this thread as the user.
 * 4. Vote (up or down) on the post and ensure the vote is recorded and
 *    attributed correctly.
 * 5. Attempt to vote again on the same post as the same user and verify the
 *    system rejects the duplicate (uniqueness enforcement).
 *
 * Validates both the happy path and the business constraint disabling
 * duplicate votes per user/post.
 */
export async function test_api_vote_creation_post_success_and_uniqueness_enforcement(
  connection: api.IConnection,
) {
  // 1. Register and authenticate new user
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(12) + "Aa!"; // >=10 chars, 1 uppercase, 1 number, 1 special
  const joinOutput = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinOutput);
  TestValidator.equals(
    "joined user's username matches input",
    joinOutput.user.username,
    username,
  );
  TestValidator.predicate(
    "token issued after join",
    typeof joinOutput.token.access === "string" &&
      joinOutput.token.access.length > 0,
  );

  // 2. Create a new discussion thread
  const threadTitle = RandomGenerator.paragraph({ sentences: 4 });
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: threadTitle,
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);
  TestValidator.equals("thread title matches input", thread.title, threadTitle);
  TestValidator.equals(
    "thread creator matches joined user",
    thread.created_by_id,
    joinOutput.user.id,
  );

  // 3. Create a post in the thread
  const postTitle = RandomGenerator.paragraph({ sentences: 4 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: postTitle,
        body: postBody,
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post title matches input", post.title, postTitle);
  TestValidator.equals(
    "post creator matches joined user",
    post.created_by_id,
    joinOutput.user.id,
  );

  // 4. Submit an upvote or downvote on the created post and validate
  const voteType = RandomGenerator.pick(["up", "down"] as const);
  const vote = await api.functional.discussionBoard.user.votes.create(
    connection,
    {
      body: {
        discussion_board_post_id: post.id,
        discussion_board_comment_id: null,
        vote_type: voteType,
      } satisfies IDiscussionBoardVote.ICreate,
    },
  );
  typia.assert(vote);
  TestValidator.equals(
    "vote is for the correct post",
    vote.discussion_board_post_id,
    post.id,
  );
  TestValidator.equals("vote type matches input", vote.vote_type, voteType);
  TestValidator.predicate(
    "vote id is uuid",
    typeof vote.id === "string" && vote.id.length > 0,
  );

  // 5. Attempt duplicate vote and assert error thrown (uniqueness enforcement)
  await TestValidator.error("duplicate voting is not allowed", async () => {
    await api.functional.discussionBoard.user.votes.create(connection, {
      body: {
        discussion_board_post_id: post.id,
        discussion_board_comment_id: null,
        vote_type: voteType,
      } satisfies IDiscussionBoardVote.ICreate,
    });
  });
}
