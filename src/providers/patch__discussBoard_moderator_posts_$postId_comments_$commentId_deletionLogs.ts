import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardCommentDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardCommentDeletionLog";
import { IPageIDiscussBoardCommentDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardCommentDeletionLog";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Search paginated audit deletion logs for a comment
 * (discuss_board_comment_deletion_logs).
 *
 * Retrieves the paginated, filterable audit deletion log history for a specific
 * comment under a specific post, supporting filters by actor, deletion reason,
 * and date ranges. Only accessible by moderators for audit, compliance, and
 * appeals workflows. Ensures that the comment belongs to the correct post as
 * per path params.
 *
 * @param props - Properties for this operation
 * @param props.moderator - Authenticated moderator making the request
 * @param props.postId - UUID of the post containing the target comment
 * @param props.commentId - UUID of the comment to fetch logs for
 * @param props.body - Filter and pagination options (actor, deletion reason,
 *   date range)
 * @returns Paginated array of deletion log records for the comment, with
 *   correct audit structure
 * @throws {Error} If comment does not exist or does not belong to target post
 */
export async function patch__discussBoard_moderator_posts_$postId_comments_$commentId_deletionLogs(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussBoardCommentDeletionLog.IRequest;
}): Promise<IPageIDiscussBoardCommentDeletionLog> {
  const { moderator, postId, commentId, body } = props;

  // Step 1: Ensure the comment exists and belongs to the given post
  const comment = await MyGlobal.prisma.discuss_board_comments.findUnique({
    where: { id: commentId },
    select: { discuss_board_post_id: true },
  });
  if (!comment || comment.discuss_board_post_id !== postId) {
    throw new Error(
      "Comment not found or does not belong to the specified post",
    );
  }

  // Step 2: Build the filter for deletion logs
  const where = {
    discuss_board_comment_id: commentId,
    ...(body.actor_user_account_id !== undefined &&
      body.actor_user_account_id !== null && {
        actor_user_account_id: body.actor_user_account_id,
      }),
    ...(body.deletion_reason !== undefined &&
      body.deletion_reason !== null && {
        deletion_reason: body.deletion_reason,
      }),
    ...((body.deleted_at_from !== undefined && body.deleted_at_from !== null) ||
    (body.deleted_at_to !== undefined && body.deleted_at_to !== null)
      ? {
          deleted_at: {
            ...(body.deleted_at_from !== undefined &&
              body.deleted_at_from !== null && { gte: body.deleted_at_from }),
            ...(body.deleted_at_to !== undefined &&
              body.deleted_at_to !== null && { lte: body.deleted_at_to }),
          },
        }
      : {}),
  };

  // Pagination logic, default to 1/20
  const page = body.page ?? (1 as number & tags.Type<"int32">);
  const limit = body.limit ?? (20 as number & tags.Type<"int32">);
  const skip = Number(page - 1) * Number(limit);

  // Step 3: Query with count for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_comment_deletion_logs.findMany({
      where,
      orderBy: { deleted_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discuss_board_comment_deletion_logs.count({ where }),
  ]);

  // Step 4: Map results to correct DTOs with date conversion
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => {
      const result: IDiscussBoardCommentDeletionLog = {
        id: row.id,
        discuss_board_comment_id: row.discuss_board_comment_id,
        actor_user_account_id: row.actor_user_account_id,
        deletion_reason: row.deletion_reason,
        deleted_at: toISOStringSafe(row.deleted_at),
      };
      // Optional actor_note (add only if not undefined/null)
      if (row.actor_note !== undefined && row.actor_note !== null) {
        result.actor_note = row.actor_note;
      }
      return result;
    }),
  };
}
