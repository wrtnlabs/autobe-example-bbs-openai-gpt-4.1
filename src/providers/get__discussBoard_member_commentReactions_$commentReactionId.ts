import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardCommentReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardCommentReaction";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Get a specific comment reaction record (discuss_board_comment_reactions) by
 * ID.
 *
 * Retrieves the details of a comment reaction by unique identifier for the
 * authenticated member. This operation returns full details for the comment
 * reaction, including reactor member, associated comment, reaction type, and
 * timestamps (created, updated, soft-deleted).
 *
 * Access is restricted: only the member who owns the reaction may retrieve its
 * details. Attempting to access another user's reaction will result in an
 * error.
 *
 * @param props - Request parameter object
 * @param props.member - The authenticated member requesting the reaction detail
 * @param props.commentReactionId - UUID of the comment reaction to retrieve
 * @returns The comment reaction record as an IDiscussBoardCommentReaction
 *   object
 * @throws {Error} If the reaction does not exist or does not belong to the
 *   member
 */
export async function get__discussBoard_member_commentReactions_$commentReactionId(props: {
  member: MemberPayload;
  commentReactionId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardCommentReaction> {
  const { member, commentReactionId } = props;

  // Find the reaction by ID, enforcing member ownership (authorization)
  const reaction =
    await MyGlobal.prisma.discuss_board_comment_reactions.findFirst({
      where: {
        id: commentReactionId,
        discuss_board_member_id: member.id,
      },
    });
  if (!reaction) {
    throw new Error("Reaction not found");
  }

  return {
    id: reaction.id,
    discuss_board_member_id: reaction.discuss_board_member_id,
    discuss_board_comment_id: reaction.discuss_board_comment_id,
    reaction_type: reaction.reaction_type === "like" ? "like" : "dislike",
    created_at: toISOStringSafe(reaction.created_at),
    updated_at: toISOStringSafe(reaction.updated_at),
    deleted_at: reaction.deleted_at
      ? toISOStringSafe(reaction.deleted_at)
      : null,
  };
}
