import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieves a specific vote record (upvote or downvote) by its unique
 * identifier.
 *
 * This operation returns complete metadata for a single vote from the
 * discussion_board_votes table, enforcing both soft-delete exclusion and vote
 * ownership (users may only retrieve their own records). Date/time fields are
 * safely converted to the branded ISO string format for API compliance.
 *
 * @param props - Request properties
 * @param props.user - Authenticated user (must be the record owner)
 * @param props.voteId - Unique identifier of the vote (UUID)
 * @returns The vote record, mapped to {@link IDiscussionBoardVote}
 * @throws {Error} If the vote does not exist or does not belong to the user
 */
export async function get__discussionBoard_user_votes_$voteId(props: {
  user: UserPayload;
  voteId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardVote> {
  const { user, voteId } = props;
  const vote = await MyGlobal.prisma.discussion_board_votes.findFirst({
    where: {
      id: voteId,
      deleted_at: null,
    },
  });
  if (!vote) throw new Error("Vote not found");
  if (vote.discussion_board_user_id !== user.id) {
    throw new Error("Forbidden: You may only view your own vote record.");
  }
  return {
    id: vote.id,
    discussion_board_post_id: vote.discussion_board_post_id ?? null,
    discussion_board_comment_id: vote.discussion_board_comment_id ?? null,
    vote_type: vote.vote_type === "up" ? "up" : "down",
    created_at: toISOStringSafe(vote.created_at),
    updated_at: toISOStringSafe(vote.updated_at),
    deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : null,
  };
}
