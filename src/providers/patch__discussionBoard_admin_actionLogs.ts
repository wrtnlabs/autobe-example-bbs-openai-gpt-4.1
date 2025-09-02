import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActionLog";
import { IPageIDiscussionBoardActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActionLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List/search detailed action logs for compliance and administration.
 *
 * This operation provides a paginated, filterable, and sortable list of action
 * logs from the discussion_board_action_logs table. Each action log details
 * granular system-level traces and sub-events associated with broader audit log
 * entries, supporting compliance, operational debugging, and advanced
 * investigations. Search criteria can include audit log IDs, status, metadata,
 * creation times, and more, strictly adhering to the
 * discussion_board_action_logs Prisma schema.
 *
 * @param props - Request properties
 * @param props.admin - Injected admin payload (authorization enforced
 *   externally)
 * @param props.body - IDiscussionBoardActionLog.IRequest: search, filter, sort,
 *   and paging criteria
 * @returns Paginated result of action logs matching query/filter criteria
 * @throws {Error} If an unknown database error occurs
 */
export async function patch__discussionBoard_admin_actionLogs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardActionLog.IRequest;
}): Promise<IPageIDiscussionBoardActionLog> {
  const { body } = props;
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);

  // Build where clause for filtering
  const createdAtRange =
    body.created_at_from !== undefined && body.created_at_from !== null
      ? body.created_at_to !== undefined && body.created_at_to !== null
        ? {
            gte: body.created_at_from,
            lte: body.created_at_to,
          }
        : {
            gte: body.created_at_from,
          }
      : body.created_at_to !== undefined && body.created_at_to !== null
        ? {
            lte: body.created_at_to,
          }
        : undefined;

  // Find rows and total count in parallel for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_action_logs.findMany({
      where: {
        ...(body.audit_log_id !== undefined &&
          body.audit_log_id !== null && {
            discussion_board_audit_log_id: body.audit_log_id,
          }),
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
        ...(createdAtRange && { created_at: createdAtRange }),
        ...(body.search !== undefined &&
          body.search !== null && {
            metadata: {
              contains: body.search,
              mode: "insensitive" as const,
            },
          }),
      },
      orderBy:
        body.sort_by === "created_at"
          ? { created_at: body.sort_order === "asc" ? "asc" : "desc" }
          : { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_action_logs.count({
      where: {
        ...(body.audit_log_id !== undefined &&
          body.audit_log_id !== null && {
            discussion_board_audit_log_id: body.audit_log_id,
          }),
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
        ...(createdAtRange && { created_at: createdAtRange }),
        ...(body.search !== undefined &&
          body.search !== null && {
            metadata: {
              contains: body.search,
              mode: "insensitive" as const,
            },
          }),
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
      discussion_board_audit_log_id: row.discussion_board_audit_log_id,
      status: row.status,
      metadata: row.metadata ?? null,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
