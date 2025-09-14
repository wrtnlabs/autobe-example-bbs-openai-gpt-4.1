import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPostReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPostReaction";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Get a specific post reaction record (discuss_board_post_reactions) by ID.
 *
 * Retrieve details of a specific post reaction identified by its unique ID.
 * This operation returns all relevant data from the
 * discuss_board_post_reactions table, offering a detailed view including target
 * post, reacting member, reaction type, timestamps, and current status.
 *
 * Access is restricted: only the reaction owner member can retrieve their own
 * post reaction record. Unauthorized access will throw an error. All access is
 * auditable.
 *
 * @param props - The input properties for this endpoint
 * @param props.member - The authenticated member making the request
 *   (MemberPayload: user_account_id)
 * @param props.postReactionId - UUID of the post reaction record to retrieve
 * @returns The detailed post reaction record matching the provided ID
 * @throws {Error} If the authenticated member is not the owner of the reaction
 * @throws {Error} If no such reaction record exists, or member is invalid
 */
export async function get__discussBoard_member_postReactions_$postReactionId(props: {
  member: MemberPayload;
  postReactionId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardPostReaction> {
  // Step 1: Fetch the member row for this authenticated user
  const myMember = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      user_account_id: props.member.id,
      deleted_at: null,
      status: "active",
    },
    select: {
      id: true,
    },
  });
  if (!myMember) throw new Error("Member not found or not active");

  // Step 2: Fetch the post reaction record by ID
  const reaction =
    await MyGlobal.prisma.discuss_board_post_reactions.findUniqueOrThrow({
      where: { id: props.postReactionId },
    });

  // Step 3: Only the owner can access their reaction record
  if (reaction.discuss_board_member_id !== myMember.id)
    throw new Error(
      "Unauthorized: Not permitted to access this reaction record",
    );

  // Step 4: Map database fields to API DTO, converting Date fields appropriately
  const result: IDiscussBoardPostReaction = {
    id: reaction.id,
    discuss_board_member_id: reaction.discuss_board_member_id,
    discuss_board_post_id: reaction.discuss_board_post_id,
    reaction_type: reaction.reaction_type === "like" ? "like" : "dislike",
    created_at: toISOStringSafe(reaction.created_at),
    updated_at: toISOStringSafe(reaction.updated_at),
    ...(reaction.deleted_at !== null
      ? { deleted_at: toISOStringSafe(reaction.deleted_at) }
      : {}),
  };
  return result;
}
