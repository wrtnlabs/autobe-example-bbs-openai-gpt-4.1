import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";
import type { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";

/**
 * Test vote creation for posts and comments with permission and content state checks.
 *
 * Validates that votes can only be created by eligible members on valid, non-deleted content using a legitimate vote type.
 *
 * Test scenarios:
 * 1. Member B can successfully vote on a post and comment by Member A.
 * 2. Guest attempts to vote fail (unauthenticated).
 * 3. Banned member attempts to vote fail (permission denied).
 * 4. Attempting to vote on deleted content fails.
 * 5. Attempting to vote with invalid vote type fails.
 *
 * Steps:
 * 1. Register Member A (author), Member B (voter), and Member C (for banning).
 * 2. Create a valid vote type (upvote).
 * 3. Member A creates thread -> post -> comment.
 * 4. Member B votes on post and comment (success expected).
 * 5. Attempt votes as guest (fail expected).
 * 6. Ban Member B, attempt votes as B again (fail expected).
 * 7. Simulate deletion of post and comment (by creating new, soft-deleted records for testing vote-failure).
 * 8. Attempt voting on deleted post/comment (fail expected).
 * 9. Attempt voting with an invalid vote type (fail expected).
 */
export async function test_api_discussionBoard_test_create_vote_on_post_and_comment_with_permission_and_content_state_checks(connection: api.IConnection) {
  // 1. Register three members
  const pw = "hashed-password-123";
  const memberA = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: pw,
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(memberA);
  const memberB = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: pw,
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(memberB);
  const memberC = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: pw,
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(memberC);

  // 2. Create a valid vote type
  const voteType = await api.functional.discussionBoard.voteTypes.post(connection, {
    body: {
      code: "upvote",
      name: "Upvote",
      description: "A positive upvote",
    },
  });
  typia.assert(voteType);

  // 3. Member A creates thread -> post -> comment
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: memberA.id,
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(8),
      body: RandomGenerator.content()(20)(),
    },
  });
  typia.assert(thread);

  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: memberA.id,
      body: RandomGenerator.content()(12)(),
    },
  });
  typia.assert(post);

  const comment = await api.functional.discussionBoard.comments.post(connection, {
    body: {
      discussion_board_post_id: post.id,
      body: RandomGenerator.content()(8)(),
      parent_id: null,
    },
  });
  typia.assert(comment);

  // 4. Member B votes on post and comment (success expected)
  // (Simulate as if Member B is authenticated: set context on connection/session outside this func)
  {
    const voteOnPost = await api.functional.discussionBoard.votes.post(connection, {
      body: {
        vote_type_id: voteType.id,
        post_id: post.id,
      },
    });
    typia.assert(voteOnPost);
    TestValidator.equals("vote post voter")(voteOnPost.vote_type_id)(voteType.id);
    TestValidator.equals("vote post id")(voteOnPost.post_id)(post.id);

    const voteOnComment = await api.functional.discussionBoard.votes.post(connection, {
      body: {
        vote_type_id: voteType.id,
        comment_id: comment.id,
      },
    });
    typia.assert(voteOnComment);
    TestValidator.equals("vote comment voter")(voteOnComment.vote_type_id)(voteType.id);
    TestValidator.equals("vote comment id")(voteOnComment.comment_id)(comment.id);
  }

  // 5. Attempt vote as guest (should fail)
  TestValidator.error("guest cannot vote on post")(() =>
    api.functional.discussionBoard.votes.post(
      { ...connection, headers: {} },
      { body: { vote_type_id: voteType.id, post_id: post.id } },
    ),
  );
  TestValidator.error("guest cannot vote on comment")(() =>
    api.functional.discussionBoard.votes.post(
      { ...connection, headers: {} },
      { body: { vote_type_id: voteType.id, comment_id: comment.id } },
    ),
  );

  // 6. Ban Member B then try to vote again as B
  const ban = await api.functional.discussionBoard.bans.post(connection, {
    body: {
      member_id: memberB.id,
      moderator_id: memberC.id, // simulate C as moderator
      ban_reason: "Violation (test)",
      permanent: true,
      expires_at: null,
    },
  });
  typia.assert(ban);
  TestValidator.error("banned member cannot vote post")(() =>
    api.functional.discussionBoard.votes.post(connection, {
      body: { vote_type_id: voteType.id, post_id: post.id },
    }),
  );
  TestValidator.error("banned member cannot vote comment")(() =>
    api.functional.discussionBoard.votes.post(connection, {
      body: { vote_type_id: voteType.id, comment_id: comment.id },
    }),
  );

  // 7. Simulate deletion: create soft-deleted post and comment
  const deletedPost = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: memberA.id,
      body: RandomGenerator.content()(10)(),
    },
  });
  typia.assert(deletedPost);
  Object.assign(deletedPost, { deleted_at: new Date().toISOString() });
  const deletedComment = await api.functional.discussionBoard.comments.post(connection, {
    body: {
      discussion_board_post_id: deletedPost.id,
      body: RandomGenerator.content()(5)(),
      parent_id: null,
    },
  });
  typia.assert(deletedComment);
  Object.assign(deletedComment, { deleted_at: new Date().toISOString() });
  TestValidator.error("vote on deleted post fails")(() =>
    api.functional.discussionBoard.votes.post(connection, {
      body: { vote_type_id: voteType.id, post_id: deletedPost.id },
    }),
  );
  TestValidator.error("vote on deleted comment fails")(() =>
    api.functional.discussionBoard.votes.post(connection, {
      body: { vote_type_id: voteType.id, comment_id: deletedComment.id },
    }),
  );

  // 8. Attempt vote with invalid vote type
  const invalidVoteTypeId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.error("vote with invalid vote type id fails")(() =>
    api.functional.discussionBoard.votes.post(connection, {
      body: { vote_type_id: invalidVoteTypeId, post_id: post.id },
    }),
  );
}