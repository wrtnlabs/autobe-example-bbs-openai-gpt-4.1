import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardCommentDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardCommentDeletionLog";
import { IPageIDiscussBoardCommentDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardCommentDeletionLog";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Search paginated audit deletion logs for a comment
 * (discuss_board_comment_deletion_logs).
 *
 * This endpoint retrieves the paginated, filterable audit deletion log history
 * for a specific comment under a post. Only accessible by administrators. The
 * handler verifies the comment belongs to the specified post, applies all
 * request filters, and performs pagination.
 *
 * @param props - Request properties
 * @param props.administrator - The authenticated administrator making the
 *   request
 * @param props.postId - UUID of the post containing the target comment
 * @param props.commentId - UUID of the comment for which deletion logs are
 *   queried
 * @param props.body - Search/pagination/filter information
 * @returns Paginated and filtered list of deletion log records for the
 *   specified comment
 * @throws {Error} If the comment does not exist under the post
 */
export async function patch__discussBoard_administrator_posts_$postId_comments_$commentId_deletionLogs(props: {
  administrator: AdministratorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussBoardCommentDeletionLog.IRequest;
}): Promise<IPageIDiscussBoardCommentDeletionLog> {
  const { postId, commentId, body } = props;

  // Pagination setup with robust conversion to plain number, to satisfy branding
  const page = Number(body.page ?? 0);
  const limit = Number(body.limit ?? 20);

  // Ensure the comment belongs to the given post
  const comment = await MyGlobal.prisma.discuss_board_comments.findFirst({
    where: { id: commentId, discuss_board_post_id: postId },
  });
  if (!comment) {
    return {
      pagination: { current: page, limit: limit, records: 0, pages: 0 },
      data: [],
    };
  }

  // Build Prisma where clause for deletion logs
  const where = {
    discuss_board_comment_id: commentId,
    ...(body.actor_user_account_id !== undefined && {
      actor_user_account_id: body.actor_user_account_id,
    }),
    ...(body.deletion_reason !== undefined && {
      deletion_reason: body.deletion_reason,
    }),
    ...(body.deleted_at_from !== undefined || body.deleted_at_to !== undefined
      ? {
          deleted_at: {
            ...(body.deleted_at_from !== undefined && {
              gte: body.deleted_at_from,
            }),
            ...(body.deleted_at_to !== undefined && {
              lte: body.deleted_at_to,
            }),
          },
        }
      : {}),
  };

  // Query paginated results and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_comment_deletion_logs.findMany({
      where,
      orderBy: { deleted_at: "desc" },
      skip: page * limit,
      take: limit,
    }),
    MyGlobal.prisma.discuss_board_comment_deletion_logs.count({ where }),
  ]);

  // Convert to API DTOs (ensure date/nullable conventions)
  const data = rows.map((row) => ({
    id: row.id,
    discuss_board_comment_id: row.discuss_board_comment_id,
    actor_user_account_id: row.actor_user_account_id,
    deletion_reason: row.deletion_reason,
    actor_note: row.actor_note ?? undefined,
    deleted_at: toISOStringSafe(row.deleted_at),
  }));

  // Construct pagination result using Number() for safe branded type assignability
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit === 0 ? 1 : limit)),
    },
    data,
  };
}
