import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Submit a new vote (upvote/downvote) on a post or comment
 * (discussion_board_votes)
 *
 * Records a new user vote, either upvote or downvote, on a post or comment in
 * the discussion board. This operation creates a new entry in the
 * discussion_board_votes table. Enforces unique active vote per user/target,
 * and validates vote_type and permissions as per business rules (cannot vote on
 * own content, no duplicate votes, only 'up'/'down' allowed). Creation triggers
 * analytic updates and audit logs. Voting is a key engagement/feedback signal
 * for posts and comments.
 *
 * @param props - Request properties
 * @param props.user - Authenticated user casting the vote
 * @param props.body - Vote creation input (target post/comment, vote_type)
 * @returns Newly created vote record metadata
 * @throws {Error} If both or neither target IDs are provided; self-vote;
 *   duplicate vote; content not found, or permission errors
 */
export async function post__discussionBoard_user_votes(props: {
  user: UserPayload;
  body: IDiscussionBoardVote.ICreate;
}): Promise<IDiscussionBoardVote> {
  const { user, body } = props;

  // Validate that exactly one of discussion_board_post_id or discussion_board_comment_id is non-null (not both, not neither)
  const isPostVote =
    body.discussion_board_post_id !== undefined &&
    body.discussion_board_post_id !== null;
  const isCommentVote =
    body.discussion_board_comment_id !== undefined &&
    body.discussion_board_comment_id !== null;
  if ((isPostVote && isCommentVote) || (!isPostVote && !isCommentVote)) {
    throw new Error(
      "Exactly one of discussion_board_post_id or discussion_board_comment_id must be provided",
    );
  }

  // Validate vote_type
  if (body.vote_type !== "up" && body.vote_type !== "down") {
    throw new Error("vote_type must be 'up' or 'down'");
  }

  // Fetch target and enforce self-vote prohibition and content existence
  if (isPostVote) {
    const post = await MyGlobal.prisma.discussion_board_posts.findUniqueOrThrow(
      {
        where: {
          id: body.discussion_board_post_id as string & tags.Format<"uuid">,
        },
        select: { created_by_id: true },
      },
    );
    if (post.created_by_id === user.id) {
      throw new Error("Cannot vote on your own post");
    }
    // Enforce uniqueness: only one active (not soft-deleted) vote per user+post
    const existing = await MyGlobal.prisma.discussion_board_votes.findFirst({
      where: {
        discussion_board_user_id: user.id,
        discussion_board_post_id: body.discussion_board_post_id as string &
          tags.Format<"uuid">,
        deleted_at: null,
      },
    });
    if (existing) {
      throw new Error("User has already voted on this post");
    }
  } else {
    const comment =
      await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
        where: {
          id: body.discussion_board_comment_id as string & tags.Format<"uuid">,
        },
        select: { created_by_id: true },
      });
    if (comment.created_by_id === user.id) {
      throw new Error("Cannot vote on your own comment");
    }
    // Enforce uniqueness: only one active vote per user+comment
    const existing = await MyGlobal.prisma.discussion_board_votes.findFirst({
      where: {
        discussion_board_user_id: user.id,
        discussion_board_comment_id:
          body.discussion_board_comment_id as string & tags.Format<"uuid">,
        deleted_at: null,
      },
    });
    if (existing) {
      throw new Error("User has already voted on this comment");
    }
  }

  // Create the vote
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discussion_board_votes.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_user_id: user.id,
      discussion_board_post_id: body.discussion_board_post_id ?? null,
      discussion_board_comment_id: body.discussion_board_comment_id ?? null,
      vote_type: body.vote_type,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Construct and return output DTO
  return {
    id: created.id,
    discussion_board_post_id: created.discussion_board_post_id ?? undefined,
    discussion_board_comment_id:
      created.discussion_board_comment_id ?? undefined,
    vote_type: created.vote_type as "up" | "down",
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
