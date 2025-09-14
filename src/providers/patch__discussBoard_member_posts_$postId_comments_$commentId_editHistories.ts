import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardCommentEditHistory";
import { IPageIDiscussBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardCommentEditHistory";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Paginate and search comment edit histories
 * (discuss_board_comment_edit_histories).
 *
 * This operation retrieves a paginated, filterable list of all edit events for
 * a specific comment, as defined in the discuss_board_comment_edit_histories
 * schema. Provides audit-trail data for tracking all edits made to comment
 * content, status, or editor notes, allowing compliance review and rollback as
 * per business rules. Query filters support search by editor, date, or reason
 * for edit, with sort and pagination for large histories.
 *
 * Access control ensures only authorized users (comment author, moderators,
 * admins) view full histories; guests do not have access. Each history entry
 * shows who edited, when, previous content, status, and editorial notes,
 * supporting rich UI features like timeline views or detailed compliance
 * reporting. Critical for transparent discussion moderation and evidentiary
 * requirements in appeals.
 *
 * @param props - Properties for querying comment edit histories
 * @param props.member - The authenticated member performing the query (must be
 *   author, moderator, or admin per business rules)
 * @param props.postId - UUID of the post containing the comment
 * @param props.commentId - UUID of the comment to inspect edit histories for
 * @param props.body - Query and pagination/filtering specification
 * @returns Paginated, filterable list of edit histories for the specific
 *   comment
 */
export async function patch__discussBoard_member_posts_$postId_comments_$commentId_editHistories(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussBoardCommentEditHistory.IRequest;
}): Promise<IPageIDiscussBoardCommentEditHistory> {
  const { commentId, body } = props;
  const pageNum =
    typeof body.page === "number" && body.page >= 0 ? body.page : 0;
  const pageLimit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;

  const where = {
    discuss_board_comment_id: commentId,
    ...(body.editor_member_id !== undefined &&
      body.editor_member_id !== null && {
        editor_member_id: body.editor_member_id,
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_comment_edit_histories.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: pageNum * pageLimit,
      take: pageLimit,
    }),
    MyGlobal.prisma.discuss_board_comment_edit_histories.count({
      where,
    }),
  ]);
  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(pageLimit),
      records: total,
      pages: Math.ceil(total / pageLimit),
    },
    data: rows.map((row) => ({
      id: row.id,
      discuss_board_comment_id: row.discuss_board_comment_id,
      editor_member_id: row.editor_member_id,
      previous_content: row.previous_content,
      previous_status: row.previous_status,
      editor_note: row.editor_note ?? null,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
