import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Permanently deletes the authenticated user's vote by voteId (hard delete, not
 * soft delete).
 *
 * This operation performs strict ownership validation and completely removes
 * the vote record from the database (no soft deletion). An audit log is written
 * to 'discussion_board_vote_histories' before removal. Only the vote's owner
 * may perform this action. The operation will fail if the vote does not exist
 * or is not owned by the current user.
 *
 * @param props - user: Authenticated user performing the deletion voteId: The
 *   vote to remove (string & tags.Format<'uuid'>)
 * @returns Void
 * @throws {Error} If the vote does not exist or is not owned by the current
 *   user
 */
export async function delete__discussionBoard_user_votes_$voteId(props: {
  user: UserPayload;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, voteId } = props;

  // Find vote by id (not soft-deleted)
  const vote = await MyGlobal.prisma.discussion_board_votes.findUnique({
    where: { id: voteId },
  });
  if (!vote) throw new Error("Vote not found");
  if (vote.discussion_board_user_id !== user.id)
    throw new Error("Forbidden: you do not own this vote");

  // Log to discussion_board_vote_histories before deletion
  await MyGlobal.prisma.discussion_board_vote_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_vote_id: vote.id,
      vote_type: vote.vote_type,
      changed_at: toISOStringSafe(new Date()),
      operation: "delete",
    },
  });

  // Hard delete the vote
  await MyGlobal.prisma.discussion_board_votes.delete({
    where: { id: voteId },
  });
}
