import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPostReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPostReaction";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new post reaction (like/dislike) by a member.
 *
 * This endpoint allows an authenticated member to add a new reaction (either
 * 'like' or 'dislike') to a specified post. It enforces uniqueness (only one
 * reaction per member per post). If a reaction by the member for this post
 * already exists (and is not soft-deleted), an error is thrown. All dates are
 * handled as ISO 8601 strings, with strict type compliance.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member performing this reaction
 * @param props.body - The reaction creation data (post ID, reaction type)
 * @returns The full reaction entity as created (conforming to
 *   IDiscussBoardPostReaction)
 * @throws {Error} When a reaction by this member for the specified post already
 *   exists
 */
export async function post__discussBoard_member_postReactions(props: {
  member: MemberPayload;
  body: IDiscussBoardPostReaction.ICreate;
}): Promise<IDiscussBoardPostReaction> {
  const { member, body } = props;

  // Step 1: Enforce one reaction per member/post – check for existing (not deleted)
  const existing = await MyGlobal.prisma.discuss_board_post_reactions.findFirst(
    {
      where: {
        discuss_board_member_id: member.id,
        discuss_board_post_id: body.discuss_board_post_id,
        deleted_at: null,
      },
    },
  );
  if (existing) {
    throw new Error("Duplicate reaction: member already reacted to this post.");
  }

  // Step 2: Insert new reaction
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discuss_board_post_reactions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discuss_board_member_id: member.id,
      discuss_board_post_id: body.discuss_board_post_id,
      // FIX: Ensure type is exactly 'like' or 'dislike', forcing literal if needed
      reaction_type: body.reaction_type === "like" ? "like" : "dislike",
      created_at: now,
      updated_at: now,
    },
  });

  // Step 3: Return full DTO, converting date/datetime fields properly
  return {
    id: created.id,
    discuss_board_member_id: created.discuss_board_member_id,
    discuss_board_post_id: created.discuss_board_post_id,
    reaction_type: created.reaction_type === "like" ? "like" : "dislike",
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
