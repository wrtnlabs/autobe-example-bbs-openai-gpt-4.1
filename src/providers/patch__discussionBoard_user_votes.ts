import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVote";
import { IPageIDiscussionBoardVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieves a paginated, filtered list of user votes on posts and comments for
 * the discussion board.
 *
 * This operation targets the discussion_board_votes model, tracking all
 * upvote/downvote actions by users on posts and comments. Filtering supports
 * user, target type, target id, vote_type, and creation date. Supports
 * pagination and sorting for large-scale voting history review and analytics.
 * Soft-deleted votes are always excluded.
 *
 * @param props - Request properties
 * @param props.user - Authenticated user payload whose votes are to be queried
 * @param props.body - Filtering, sorting, and pagination options for votes
 * @returns Paginated list of user's vote records and pagination metadata
 * @throws {Error} If database query fails or access is not permitted for the
 *   user
 */
export async function patch__discussionBoard_user_votes(props: {
  user: UserPayload;
  body: IDiscussionBoardVote.IRequest;
}): Promise<IPageIDiscussionBoardVote> {
  const { user, body } = props;
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Build filter using schema-verified fields and correct null-handling
  const filter = {
    discussion_board_user_id: user.id,
    deleted_at: null,
    ...(body.vote_type !== undefined && { vote_type: body.vote_type }),
    ...(body.discussion_board_post_id !== undefined &&
      body.discussion_board_post_id !== null && {
        discussion_board_post_id: body.discussion_board_post_id,
      }),
    ...(body.discussion_board_comment_id !== undefined &&
      body.discussion_board_comment_id !== null && {
        discussion_board_comment_id: body.discussion_board_comment_id,
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: body.created_from,
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: body.created_to,
              }),
          },
        }
      : {}),
  };
  const sort_by = body.sort_by === "created_at" ? "created_at" : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // Query DB
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_votes.findMany({
      where: filter,
      orderBy: { [sort_by]: sort_order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_votes.count({ where: filter }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((row) => ({
      id: row.id,
      discussion_board_post_id: row.discussion_board_post_id ?? null,
      discussion_board_comment_id: row.discussion_board_comment_id ?? null,
      vote_type: row.vote_type as "up" | "down",
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
