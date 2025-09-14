import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardCommentReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardCommentReaction";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Updates an existing comment reaction (like/dislike) for a specific comment.
 *
 * This operation allows a member to toggle or switch their own reaction type
 * (e.g., from 'like' to 'dislike') on a specific comment in the
 * discuss_board_comment_reactions table. Only the owning member may update
 * their reaction, and only active, not-deleted reaction records can be
 * changed.
 *
 * Business logic includes validation of member's ownership, ensuring the
 * reaction exists and is not soft-deleted, and restricting the reaction_type to
 * the allowed enum values. All date fields are handled as strings in ISO 8601
 * format.
 *
 * @param props - The operation properties
 * @param props.member - The authenticated member performing the update
 * @param props.commentReactionId - The UUID of the reaction to update
 * @param props.body - The update payload containing the new reaction_type
 *   ('like' or 'dislike')
 * @returns The updated comment reaction entity
 * @throws {Error} If the member is not active, does not own the reaction, or
 *   the reaction is not found or already deleted
 */
export async function put__discussBoard_member_commentReactions_$commentReactionId(props: {
  member: MemberPayload;
  commentReactionId: string & tags.Format<"uuid">;
  body: IDiscussBoardCommentReaction.IUpdate;
}): Promise<IDiscussBoardCommentReaction> {
  const { member, commentReactionId, body } = props;

  // Fetch the DB record for this member (by user_account_id)
  const dbMember = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      user_account_id: member.id,
      deleted_at: null,
      status: "active",
    },
  });
  if (!dbMember) throw new Error("Member not found or not active");

  // Retrieve the reaction by its id, only if not soft-deleted
  const existing =
    await MyGlobal.prisma.discuss_board_comment_reactions.findFirst({
      where: {
        id: commentReactionId,
        deleted_at: null,
      },
    });
  if (!existing)
    throw new Error("Comment reaction not found or already deleted");

  // Ownership check: verify that the current member owns this reaction
  if (existing.discuss_board_member_id !== dbMember.id) {
    throw new Error(
      "Unauthorized: only the owning member may update this reaction",
    );
  }

  // Prepare updated_at timestamp
  const now = toISOStringSafe(new Date());

  // Update reaction: toggle reaction_type and updated_at
  const updated = await MyGlobal.prisma.discuss_board_comment_reactions.update({
    where: { id: commentReactionId },
    data: {
      reaction_type: body.reaction_type,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    discuss_board_member_id: updated.discuss_board_member_id,
    discuss_board_comment_id: updated.discuss_board_comment_id,
    reaction_type: updated.reaction_type === "like" ? "like" : "dislike",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
