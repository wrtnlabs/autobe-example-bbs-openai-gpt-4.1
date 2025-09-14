import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardCommentReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardCommentReaction";
import { IPageIDiscussBoardCommentReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardCommentReaction";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * List and filter all comment reactions (discuss_board_comment_reactions) with
 * pagination.
 *
 * Retrieves a paginated and filtered list of comment reactions for the
 * authenticated member. Supports filtering by comment ID, reaction type, and
 * creation date range. Ensures the member can only access their own reactions,
 * with all results strictly scoped to the authenticated user.
 *
 * @param props - Object containing the authenticated member and request
 *   filters.
 * @param props.member - Payload for the authenticated member making the
 *   request.
 * @param props.body - Request body containing filter, search, and pagination
 *   options for the comment reactions.
 * @returns Paginated summary object containing matching comment reaction
 *   records and pagination metadata.
 * @throws {Error} If a member tries to query reactions for another member.
 */
export async function patch__discussBoard_member_commentReactions(props: {
  member: MemberPayload;
  body: IDiscussBoardCommentReaction.IRequest;
}): Promise<IPageIDiscussBoardCommentReaction.ISummary> {
  const { member, body } = props;

  // Enforce member can only see their own reactions
  if (
    body.discuss_board_member_id !== undefined &&
    body.discuss_board_member_id !== member.id
  ) {
    throw new Error("Forbidden: You can only view your own comment reactions.");
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const take = limit > 100 ? 100 : limit; // Hard maximum cap at 100
  const skip = (page - 1) * take;

  // Build where condition immutably, checking required and optional filters
  // Only include reactions not soft-deleted and belonging to authenticated member
  const where = {
    deleted_at: null,
    discuss_board_member_id: member.id,
    ...(body.discuss_board_comment_id !== undefined &&
    body.discuss_board_comment_id !== null
      ? { discuss_board_comment_id: body.discuss_board_comment_id }
      : {}),
    ...(body.reaction_type !== undefined && body.reaction_type !== null
      ? { reaction_type: body.reaction_type }
      : {}),
    ...((body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
      ? {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && {
                gte: body.created_after,
              }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && {
                lte: body.created_before,
              }),
          },
        }
      : {}),
  };

  // Query paginated results and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_comment_reactions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.discuss_board_comment_reactions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(take),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(take)),
    },
    data: rows.map((r) => ({
      id: r.id,
      discuss_board_member_id: r.discuss_board_member_id,
      discuss_board_comment_id: r.discuss_board_comment_id,
      reaction_type: r.reaction_type,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    })),
  };
}
