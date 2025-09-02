import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";
import type { IPageIDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate the retrieval of a paginated, filterable list of votes cast by
 * an authenticated user.
 *
 * This comprehensive workflow covers:
 *
 * 1. Registering and authenticating a user (creating a valid session/token)
 * 2. Creating a discussion thread
 * 3. Creating multiple posts within the thread
 * 4. Creating comments linked to these posts
 * 5. Casting votes (both up and down) on created posts and comments
 * 6. Querying the /discussionBoard/user/votes endpoint with different filter
 *    and pagination combinations: a. No filters (should return all votes by
 *    this user) b. Filtered by post_id, by comment_id, and by vote_type
 *    ('up'/'down') c. With paginated settings (testing limits and correct
 *    metadata)
 * 7. Asserting the listed votes are correct (all are from authenticated user,
 *    they match filter criteria, pagination works)
 *
 * Logic ensures business rules: only own votes are listed, filters are
 * applied properly, pagination metadata is accurate, and no orphan or
 * extraneous votes appear. Edge checks include filtering for non-matching
 * IDs and limits/pagination boundaries.
 */
export async function test_api_vote_list_success(connection: api.IConnection) {
  // 1. Register and authenticate a user
  const userRegInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username:
      RandomGenerator.name(2).replace(" ", "_") +
      RandomGenerator.alphaNumeric(4),
    password: RandomGenerator.alphaNumeric(12) + "A1!",
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const auth = await api.functional.auth.user.join(connection, {
    body: userRegInput,
  });
  typia.assert(auth);

  // 2. Create a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 3,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create multiple posts in thread
  const posts = await ArrayUtil.asyncMap([0, 1], async (i) => {
    const post = await api.functional.discussionBoard.user.threads.posts.create(
      connection,
      {
        threadId: thread.id,
        body: {
          thread_id: thread.id,
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 7,
          }),
        } satisfies IDiscussionBoardPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // 4. For each post, create a comment
  const comments = await ArrayUtil.asyncMap(posts, async (post) => {
    const comment =
      await api.functional.discussionBoard.user.threads.posts.comments.create(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          body: {
            post_id: post.id,
            body: RandomGenerator.paragraph({
              sentences: 5,
              wordMin: 3,
              wordMax: 10,
            }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    return comment;
  });

  // 5. Cast votes on created posts/comments (up/down mix)
  const voteTargets = [
    { discussion_board_post_id: posts[0].id, vote_type: "up" },
    { discussion_board_post_id: posts[1].id, vote_type: "down" },
    { discussion_board_comment_id: comments[0].id, vote_type: "up" },
    { discussion_board_comment_id: comments[1].id, vote_type: "down" },
  ];

  const castedVotes = await ArrayUtil.asyncMap(
    voteTargets,
    async (voteInfo) => {
      const vote = await api.functional.discussionBoard.user.votes.create(
        connection,
        {
          body: voteInfo as IDiscussionBoardVote.ICreate,
        },
      );
      typia.assert(vote);
      return vote;
    },
  );

  // 6a. Retrieve all votes (no filter)
  const listedAllVotes = await api.functional.discussionBoard.user.votes.index(
    connection,
    {
      body: { limit: 25, page: 1 } satisfies IDiscussionBoardVote.IRequest,
    },
  );
  typia.assert(listedAllVotes);

  // Assert all votes in listing are owned by test user (based on created/cast count)
  TestValidator.equals(
    "vote listing count matches casted votes",
    listedAllVotes.data.length,
    castedVotes.length,
  );

  // 6b. Filter by post_id, comment_id, and vote_type
  // Filter by post
  for (const [i, post] of posts.entries()) {
    const filteredByPost =
      await api.functional.discussionBoard.user.votes.index(connection, {
        body: {
          limit: 10,
          page: 1,
          discussion_board_post_id: post.id,
        } satisfies IDiscussionBoardVote.IRequest,
      });
    typia.assert(filteredByPost);
    // Only votes for that post should appear
    for (const vote of filteredByPost.data) {
      TestValidator.equals(
        "vote is for filtered post",
        vote.discussion_board_post_id,
        post.id,
      );
    }
  }

  // Filter by comment
  for (const [i, comment] of comments.entries()) {
    const filteredByComment =
      await api.functional.discussionBoard.user.votes.index(connection, {
        body: {
          limit: 10,
          page: 1,
          discussion_board_comment_id: comment.id,
        } satisfies IDiscussionBoardVote.IRequest,
      });
    typia.assert(filteredByComment);
    for (const vote of filteredByComment.data) {
      TestValidator.equals(
        "vote is for filtered comment",
        vote.discussion_board_comment_id,
        comment.id,
      );
    }
  }

  // Filter by vote_type (up)
  const filteredUp = await api.functional.discussionBoard.user.votes.index(
    connection,
    {
      body: {
        limit: 10,
        page: 1,
        vote_type: "up",
      } satisfies IDiscussionBoardVote.IRequest,
    },
  );
  typia.assert(filteredUp);
  for (const vote of filteredUp.data) {
    TestValidator.equals("vote is up type", vote.vote_type, "up");
  }

  // Filter by vote_type (down)
  const filteredDown = await api.functional.discussionBoard.user.votes.index(
    connection,
    {
      body: {
        limit: 10,
        page: 1,
        vote_type: "down",
      } satisfies IDiscussionBoardVote.IRequest,
    },
  );
  typia.assert(filteredDown);
  for (const vote of filteredDown.data) {
    TestValidator.equals("vote is down type", vote.vote_type, "down");
  }

  // 6c. Pagination test: limit=2, page=1 (should return two votes)
  const pagedVotesPage1 = await api.functional.discussionBoard.user.votes.index(
    connection,
    {
      body: { limit: 2, page: 1 } satisfies IDiscussionBoardVote.IRequest,
    },
  );
  typia.assert(pagedVotesPage1);
  TestValidator.equals(
    "pagination (page 1) returns limit votes or fewer",
    pagedVotesPage1.data.length,
    Math.min(2, castedVotes.length),
  );
  TestValidator.equals(
    "pagination metadata limit correct",
    pagedVotesPage1.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination metadata page correct",
    pagedVotesPage1.pagination.current,
    1,
  );

  // 6d. Pagination test: page=2 (remaining or empty)
  const pagedVotesPage2 = await api.functional.discussionBoard.user.votes.index(
    connection,
    {
      body: { limit: 2, page: 2 } satisfies IDiscussionBoardVote.IRequest,
    },
  );
  typia.assert(pagedVotesPage2);
  TestValidator.equals(
    "pagination (page 2) returns remainder votes or 0",
    pagedVotesPage2.data.length,
    Math.max(0, castedVotes.length - 2),
  );
  TestValidator.equals(
    "pagination metadata page correct (2)",
    pagedVotesPage2.pagination.current,
    2,
  );

  // 7. Edge: filter by non-matching post/comment id
  const nonMatchPostVotes =
    await api.functional.discussionBoard.user.votes.index(connection, {
      body: {
        limit: 10,
        page: 1,
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IDiscussionBoardVote.IRequest,
    });
  typia.assert(nonMatchPostVotes);
  TestValidator.equals(
    "non-matching post filter returns 0 votes",
    nonMatchPostVotes.data.length,
    0,
  );

  const nonMatchCommentVotes =
    await api.functional.discussionBoard.user.votes.index(connection, {
      body: {
        limit: 10,
        page: 1,
        discussion_board_comment_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardVote.IRequest,
    });
  typia.assert(nonMatchCommentVotes);
  TestValidator.equals(
    "non-matching comment filter returns 0 votes",
    nonMatchCommentVotes.data.length,
    0,
  );
}
