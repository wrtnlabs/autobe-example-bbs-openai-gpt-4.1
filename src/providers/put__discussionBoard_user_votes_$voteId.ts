import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update an existing vote (upvote/downvote) for a post or comment by voteId.
 *
 * This API allows an authenticated user to update an existing vote (upvote or
 * downvote) that they have previously cast on a post or comment. The operation
 * validates that the voteId belongs to the current user and that the new vote
 * type is valid ('up' or 'down'), as constrained by the schema. All
 * modifications are logged in the associated history table for audit purposes.
 *
 * Role-based access control ensures only the owner of the vote may update it.
 * Attempts by other users or unauthenticated actors are denied with a clear
 * error message. The endpoint enforces deduplication rules to prevent duplicate
 * voting by the same user on a single piece of content.
 *
 * Business logic ensures that votes cannot be updated for soft-deleted or
 * deleted content, and any attempts to update non-existent votes will return a
 * not found or access denied error. The response includes the updated vote
 * details for immediate UI feedback.
 *
 * If the operation is performed on a vote linked to a soft-deleted post or
 * comment, a business-level error is returned. All updates are reflected in the
 * main table and the detailed vote history log for compliance and traceability.
 * Related endpoints include vote creation (POST), vote retrieval (GET), vote
 * deletion (DELETE), and vote audit trail (GET).
 *
 * @param props - Request properties
 * @param props.user - The authenticated user making the request. Only the owner
 *   of the vote may update it.
 * @param props.voteId - The unique identifier of the vote to update.
 * @param props.body - The vote update data containing the new vote_type ('up'
 *   or 'down').
 * @returns The updated vote record (IDiscussionBoardVote) after successful
 *   modification.
 * @throws {Error} When the vote does not exist, is deleted, does not belong to
 *   the user, or is attached to deleted content.
 */
export async function put__discussionBoard_user_votes_$voteId(props: {
  user: UserPayload;
  voteId: string & tags.Format<"uuid">;
  body: IDiscussionBoardVote.IUpdate;
}): Promise<IDiscussionBoardVote> {
  const { user, voteId, body } = props;

  // Fetch the vote and ensure it exists (not deleted), with content for soft-delete check
  const vote = await MyGlobal.prisma.discussion_board_votes.findFirst({
    where: {
      id: voteId,
      deleted_at: null,
    },
    include: {
      post: true,
      comment: true,
    },
  });

  if (!vote) {
    throw new Error("Vote not found or already deleted.");
  }
  // Only allow owner to update
  if (vote.discussion_board_user_id !== user.id) {
    throw new Error("Unauthorized: only the vote owner can update this vote.");
  }
  // If associated post, ensure not soft-deleted
  if (vote.post && vote.post.deleted_at !== null) {
    throw new Error("Cannot update vote on a deleted post.");
  }
  // If associated comment, ensure not soft-deleted
  if (vote.comment && vote.comment.deleted_at !== null) {
    throw new Error("Cannot update vote on a deleted comment.");
  }

  // Update vote_type and updated_at
  const now = toISOStringSafe(new Date());
  const updatedVote = await MyGlobal.prisma.discussion_board_votes.update({
    where: { id: voteId },
    data: {
      vote_type: body.vote_type,
      updated_at: now,
    },
  });

  // Log in history table
  await MyGlobal.prisma.discussion_board_vote_histories.create({
    data: {
      id: v4(),
      discussion_board_vote_id: vote.id,
      vote_type: body.vote_type,
      changed_at: now,
      operation: "update",
    },
  });

  // Compose and return API response
  return {
    id: updatedVote.id,
    discussion_board_post_id: updatedVote.discussion_board_post_id ?? null,
    discussion_board_comment_id:
      updatedVote.discussion_board_comment_id ?? null,
    vote_type: updatedVote.vote_type === "down" ? "down" : "up",
    created_at: toISOStringSafe(updatedVote.created_at),
    updated_at: toISOStringSafe(updatedVote.updated_at),
    deleted_at:
      updatedVote.deleted_at !== null
        ? toISOStringSafe(updatedVote.deleted_at)
        : null,
  };
}
