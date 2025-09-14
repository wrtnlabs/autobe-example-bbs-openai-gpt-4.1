import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPostEditHistory";
import { IPageIDiscussBoardPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardPostEditHistory";

/**
 * List edit history entries for a given discussBoard post (with
 * search/pagination).
 *
 * This endpoint retrieves the edit history for a given post by ID. Clients can
 * filter by editor, timestamp interval, and page through the results. All
 * date-time values are returned as ISO 8601 strings. Throws if post does not
 * exist or pagination is invalid. Open to all users (public access, no
 * authentication enforced).
 *
 * @param props - Input properties
 * @param props.postId - The unique identifier of the post whose edit histories
 *   are requested
 * @param props.body - Filtering, paging options
 * @returns Paginated and filtered list of post edit history summaries
 * @throws {Error} If post does not exist, or page/limit invalid
 */
export async function patch__discussBoard_posts_$postId_editHistories(props: {
  postId: string & tags.Format<"uuid">;
  body: IDiscussBoardPostEditHistory.IRequest;
}): Promise<IPageIDiscussBoardPostEditHistory.ISummary> {
  const { postId, body } = props;

  // Ensure post exists
  const post = await MyGlobal.prisma.discuss_board_posts.findUnique({
    where: { id: postId },
  });
  if (!post) throw new Error("Post not found");

  // Assign and validate pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  if (
    typeof page !== "number" ||
    typeof limit !== "number" ||
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    page < 1 ||
    limit < 1 ||
    limit > 100
  ) {
    throw new Error("Invalid page or limit");
  }

  // Construct where clause safely and immutably
  const where = {
    post_id: postId,
    ...(body.editor_id !== undefined &&
      body.editor_id !== null && { editor_id: body.editor_id }),
    ...((body.edit_timestamp_from !== undefined ||
      body.edit_timestamp_to !== undefined) && {
      edit_timestamp: {
        ...(body.edit_timestamp_from !== undefined && {
          gte: body.edit_timestamp_from,
        }),
        ...(body.edit_timestamp_to !== undefined && {
          lte: body.edit_timestamp_to,
        }),
      },
    }),
  };

  // Parallel fetch of count and results
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.discuss_board_post_edit_histories.count({ where }),
    MyGlobal.prisma.discuss_board_post_edit_histories.findMany({
      where,
      orderBy: { edit_timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        post_id: true,
        editor_id: true,
        edited_title: true,
        edit_reason: true,
        edit_timestamp: true,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      post_id: row.post_id,
      editor_id: row.editor_id,
      edited_title: row.edited_title,
      ...(row.edit_reason !== undefined &&
        row.edit_reason !== null && { edit_reason: row.edit_reason }),
      edit_timestamp: toISOStringSafe(row.edit_timestamp),
    })),
  };
}
