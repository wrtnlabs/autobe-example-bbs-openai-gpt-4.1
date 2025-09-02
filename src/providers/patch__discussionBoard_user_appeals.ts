import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { IPageIDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAppeal";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Search and retrieve appeals with filtering, pagination, and workflow sorting.
 *
 * Retrieve a filtered, paginated list of appeals against moderation actions or
 * flag reports. Supports advanced search/filtering by appellant user, status,
 * reason, related moderation action or flag report, and submission/resolution
 * timestamps. Includes pagination controls, keyword search, and sorting options
 * for workflow efficiency.
 *
 * Security rules prevent disclosure of sensitive details to unauthorized users;
 * only moderators and admins can access all appeals, while users may see their
 * own. This endpoint supports compliance needs and moderation workflow
 * management.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user requesting their own appeal list
 * @param props.body - Search, filtering, and pagination information for appeal
 *   triage
 * @returns Paginated list of appeals owned by the authenticated user and
 *   matching the filters
 * @throws {Error} When provided pagination parameters are invalid (page or
 *   limit < 1)
 */
export async function patch__discussionBoard_user_appeals(props: {
  user: UserPayload;
  body: IDiscussionBoardAppeal.IRequest;
}): Promise<IPageIDiscussionBoardAppeal> {
  const { user, body } = props;

  // Validate and normalize pagination
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit >= 1
      ? body.limit
      : 20;
  const page =
    body.page !== undefined && body.page !== null && body.page >= 1
      ? body.page
      : 1;
  if (limit < 1) throw new Error("Limit must be >= 1");
  if (page < 1) throw new Error("Page must be >= 1");
  const offset = (page - 1) * limit;

  // Strict user isolation: always only for their own appeals
  const where = {
    deleted_at: null,
    appellant_id: user.id,
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

  // Query total count
  const total = await MyGlobal.prisma.discussion_board_appeals.count({ where });

  // Query data page
  const rows = await MyGlobal.prisma.discussion_board_appeals.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip: offset,
    take: limit,
  });

  // Map and type/rebrand all fields for output
  const data = rows.map((row) => ({
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
  }));

  // Build output with pagination
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
