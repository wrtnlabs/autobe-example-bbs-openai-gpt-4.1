import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardCommentReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardCommentReaction";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new reaction (like/dislike) for a comment
 * (discuss_board_comment_reactions table).
 *
 * This operation creates a new comment reaction for a specific comment by the
 * authenticated member. The API enforces that only one reaction (like/dislike)
 * per member per comment can exist, and provides soft-deletion support for
 * business/audit requirements. If a previous reaction by the member exists and
 * was soft-deleted, it will be undeleted and updated instead of creating a
 * duplicate. Members cannot react to their own comments, and reactions are only
 * allowed if the target comment is active and not locked.
 *
 * Authorization: Only authenticated members may perform this operation.
 * Validation includes comment existence, non-ownership, non-lock, and business
 * rules for reactions.
 *
 * @param props - Properties for the reaction creation operation
 * @param props.member - The authenticated member performing the reaction
 * @param props.body - The reaction creation input including comment ID and
 *   reaction type
 * @returns The created (or re-activated) comment reaction entity with all
 *   fields
 * @throws {Error} If the comment does not exist, is locked, is deleted, member
 *   is author, or reaction already exists
 */
export async function post__discussBoard_member_commentReactions(props: {
  member: MemberPayload;
  body: IDiscussBoardCommentReaction.ICreate;
}): Promise<IDiscussBoardCommentReaction> {
  const { member, body } = props;

  // Fetch the comment to validate prerequisites and get author
  const comment = await MyGlobal.prisma.discuss_board_comments.findUnique({
    where: { id: body.discuss_board_comment_id },
  });
  if (!comment) {
    throw new Error("Comment not found");
  }
  if (comment.is_locked) {
    throw new Error("Comment is locked");
  }
  if (comment.deleted_at !== null) {
    throw new Error("Comment is deleted");
  }
  if (comment.author_member_id === member.id) {
    throw new Error("Members cannot react to their own comments");
  }
  if (body.reaction_type !== "like" && body.reaction_type !== "dislike") {
    throw new Error("Reaction type must be 'like' or 'dislike'");
  }

  // Check for existing reaction (active or deleted) to enforce uniqueness and potentially revive
  const priorReaction =
    await MyGlobal.prisma.discuss_board_comment_reactions.findUnique({
      where: {
        discuss_board_member_id_discuss_board_comment_id: {
          discuss_board_member_id: member.id,
          discuss_board_comment_id: body.discuss_board_comment_id,
        },
      },
    });

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  let reactionRecord;
  if (priorReaction && priorReaction.deleted_at === null) {
    // Member already has an active reaction for this comment
    throw new Error("You have already reacted to this comment");
  } else if (priorReaction && priorReaction.deleted_at !== null) {
    // Revive soft-deleted reaction
    reactionRecord =
      await MyGlobal.prisma.discuss_board_comment_reactions.update({
        where: {
          discuss_board_member_id_discuss_board_comment_id: {
            discuss_board_member_id: member.id,
            discuss_board_comment_id: body.discuss_board_comment_id,
          },
        },
        data: {
          reaction_type: body.reaction_type,
          updated_at: now,
          deleted_at: null,
        },
      });
  } else {
    // Create a new unique reaction
    const reactionId: string & tags.Format<"uuid"> = v4() as string &
      tags.Format<"uuid">;
    reactionRecord =
      await MyGlobal.prisma.discuss_board_comment_reactions.create({
        data: {
          id: reactionId,
          discuss_board_member_id: member.id,
          discuss_board_comment_id: body.discuss_board_comment_id,
          reaction_type: body.reaction_type,
          created_at: now,
          updated_at: now,
          // deleted_at omitted (will be undefined)
        },
      });
  }

  return {
    id: reactionRecord.id,
    discuss_board_member_id: reactionRecord.discuss_board_member_id,
    discuss_board_comment_id: reactionRecord.discuss_board_comment_id,
    reaction_type: reactionRecord.reaction_type as "like" | "dislike",
    created_at: toISOStringSafe(reactionRecord.created_at),
    updated_at: toISOStringSafe(reactionRecord.updated_at),
    deleted_at:
      reactionRecord.deleted_at !== undefined &&
      reactionRecord.deleted_at !== null
        ? toISOStringSafe(reactionRecord.deleted_at)
        : null,
  };
}
