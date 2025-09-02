import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { IPageIDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAppeal";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a filtered, paginated list of appeals submitted against
 * moderation actions or flag reports.
 *
 * This endpoint allows an administrator to retrieve all appeals submitted by
 * users, with options to filter by appellant, associated moderation action or
 * flag report, status, and creation date. Pagination and sorting are supported
 * for efficient moderation and compliance workflows. Soft-deleted items are
 * excluded.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the request
 * @param props.body - Search, filtering, and pagination information for appeal
 *   triage
 * @returns Paginated list of appeals matching the search/filter criteria
 * @throws {Error} When a database access or internal error occurs
 */
export async function patch__discussionBoard_admin_appeals(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAppeal.IRequest;
}): Promise<IPageIDiscussionBoardAppeal> {
  const { body } = props;

  // Pagination: default page=1, limit=20 if not provided, use Number() for uint32 brand type compatibility
  const page =
    body.page !== undefined && body.page !== null && body.page > 0
      ? Number(body.page)
      : 1;
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit > 0
      ? Number(body.limit)
      : 20;

  // Dynamic where clause, handling all filters
  const where = {
    deleted_at: null,
    ...(body.appellant_id !== undefined &&
      body.appellant_id !== null && {
        appellant_id: body.appellant_id,
      }),
    ...(body.moderation_action_id !== undefined &&
      body.moderation_action_id !== null && {
        moderation_action_id: body.moderation_action_id,
      }),
    ...(body.flag_report_id !== undefined &&
      body.flag_report_id !== null && {
        flag_report_id: body.flag_report_id,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
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

  // Fetch rows and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_appeals.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_appeals.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
    data: rows.map((row) => ({
      id: row.id,
      appellant_id: row.appellant_id,
      moderation_action_id: row.moderation_action_id ?? null,
      flag_report_id: row.flag_report_id ?? null,
      appeal_reason: row.appeal_reason,
      status: row.status,
      resolution_comment: row.resolution_comment ?? null,
      resolved_at: row.resolved_at ? toISOStringSafe(row.resolved_at) : null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
