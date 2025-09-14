import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPostReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPostReaction";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update an existing post reaction (toggle like/dislike).
 *
 * Enables a member to change the type of their reaction (like/dislike) on a
 * post they previously reacted to. The endpoint enforces strict ownership and
 * data integrity: only the member who created the reaction may update it, and
 * updates on soft-deleted reactions are not allowed. The system also updates
 * the audit timestamp. All business and audit rules are strictly enforced as
 * per the discuss_board_post_reactions table schema.
 *
 * @param props - Parameters for the operation
 * @param props.member - Authenticated member performing the update (must be the
 *   owner of the reaction)
 * @param props.postReactionId - UUID of the post reaction to update
 * @param props.body - Updated reaction data (reaction_type: 'like' | 'dislike')
 * @returns The updated post reaction record reflecting the new type and audit
 *   information
 * @throws {Error} If the reaction does not exist, is soft-deleted, or if the
 *   member is not the owner
 */
export async function put__discussBoard_member_postReactions_$postReactionId(props: {
  member: MemberPayload;
  postReactionId: string & tags.Format<"uuid">;
  body: IDiscussBoardPostReaction.IUpdate;
}): Promise<IDiscussBoardPostReaction> {
  const { member, postReactionId, body } = props;
  const reaction =
    await MyGlobal.prisma.discuss_board_post_reactions.findUnique({
      where: { id: postReactionId },
    });
  if (!reaction) {
    throw new Error("Reaction not found");
  }
  // Authorization: Only owner can update
  if (reaction.discuss_board_member_id !== member.id) {
    throw new Error("You do not have permission to update this reaction");
  }
  // Disallow change if reaction is soft deleted
  if (reaction.deleted_at !== null && reaction.deleted_at !== undefined) {
    throw new Error("Cannot update a deleted reaction");
  }
  // Always update updated_at to now
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discuss_board_post_reactions.update({
    where: { id: postReactionId },
    data: {
      reaction_type: body.reaction_type as "like" | "dislike",
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    discuss_board_member_id: updated.discuss_board_member_id,
    discuss_board_post_id: updated.discuss_board_post_id,
    reaction_type: updated.reaction_type as "like" | "dislike",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
