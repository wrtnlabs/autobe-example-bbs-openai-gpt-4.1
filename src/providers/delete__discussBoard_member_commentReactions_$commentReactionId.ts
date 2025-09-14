import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Soft-deletes a comment reaction record belonging to the logged-in member.
 *
 * This operation marks the comment reaction as deleted by setting its
 * deleted_at timestamp to the current time (ISO string). Only the member who
 * originally created the reaction is permitted to perform this operation.
 * Moderator/administrator logic is not implemented here; business rules for
 * escalation may be handled elsewhere.
 *
 * Steps:
 *
 * - Look up the logged-in member's internal member ID via their user account
 *   (props.member.id)
 * - Fetch the reaction by ID and ensure it is not already deleted
 * - Authorize: Verify the current member is the creator of the reaction
 * - Update the reaction's deleted_at field to the current timestamp (soft delete)
 *
 * @param props - Operation properties
 * @param props.member - The authenticated member context (payload)
 * @param props.commentReactionId - The UUID of the comment reaction to delete
 * @returns Void
 * @throws {Error} If the reaction does not exist, is already deleted, or the
 *   user is not authorized
 */
export async function delete__discussBoard_member_commentReactions_$commentReactionId(props: {
  member: MemberPayload;
  commentReactionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the member ID mapped to the calling user account
  const foundMember = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      user_account_id: props.member.id,
      deleted_at: null,
      status: "active",
    },
    select: { id: true },
  });
  if (!foundMember) throw new Error("Member not found or not active.");

  // Get the reaction and check that it is not already deleted
  const reaction =
    await MyGlobal.prisma.discuss_board_comment_reactions.findUniqueOrThrow({
      where: { id: props.commentReactionId },
      select: {
        id: true,
        discuss_board_member_id: true,
        deleted_at: true,
      },
    });
  if (reaction.deleted_at !== null && reaction.deleted_at !== undefined)
    throw new Error("Comment reaction already deleted.");

  // Ensure ownership (only the creator can delete)
  if (reaction.discuss_board_member_id !== foundMember.id) {
    throw new Error(
      "Unauthorized: Only the member who created this reaction can delete it.",
    );
  }

  // Perform soft delete (set deleted_at)
  await MyGlobal.prisma.discuss_board_comment_reactions.update({
    where: { id: props.commentReactionId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
