import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Delete (soft-delete) a post reaction by its unique ID.
 *
 * This endpoint allows an authenticated member to remove (soft-delete) their
 * own reaction (like/dislike) to a post. Only the member who originally
 * performed the reaction may delete it. The deletion is performed by updating
 * the deleted_at and updated_at fields with the current timestamp, preserving
 * audit history and ensuring business compliance. Attempts to delete a
 * non-existent or already-deleted reaction, or to delete another member's
 * reaction, will result in an error.
 *
 * @param props - Object including the authenticated member's payload and the
 *   unique identifier of the post reaction.
 * @param props.member - The authenticated member performing the operation.
 * @param props.postReactionId - UUID of the post reaction to be deleted.
 * @returns Void
 * @throws {Error} If the post reaction is not found, already deleted, or if the
 *   member is not authorized to delete this reaction.
 */
export async function delete__discussBoard_member_postReactions_$postReactionId(props: {
  member: MemberPayload;
  postReactionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postReactionId } = props;

  // Step 1: Fetch and check existence + not-deleted
  const reaction = await MyGlobal.prisma.discuss_board_post_reactions.findFirst(
    {
      where: {
        id: postReactionId,
        deleted_at: null,
      },
      select: {
        id: true,
        discuss_board_member_id: true,
      },
    },
  );
  if (!reaction) {
    throw new Error("Post reaction not found or already deleted.");
  }
  // Step 2: Ownership check
  if (reaction.discuss_board_member_id !== member.id) {
    throw new Error("Unauthorized: You can only delete your own reaction.");
  }
  // Step 3: Soft-delete by updating deleted_at and updated_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discuss_board_post_reactions.update({
    where: { id: postReactionId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
