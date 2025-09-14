import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardContentReport";
import { IPageIDiscussBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardContentReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Search and retrieve a list of content reports (discuss_board_content_reports
 * table).
 *
 * Retrieves a paginated, filtered list of content reports submitted by members
 * for moderation purposes. Filters include content_type, reporter_member_id,
 * status, creation date window, and full-text search on reason. Results are
 * sorted and paginated for moderator workflows.
 *
 * Authorization: Moderator role required. All records with deleted_at are
 * excluded. Security is enforced through the ModeratorAuth decorator.
 *
 * @param props - Properties for the search operation
 * @param props.moderator - Authenticated moderator payload
 * @param props.body - Search, filter, and pagination parameters
 * @returns Paginated summary collection of content reports for moderation
 *   dashboard
 * @throws {Error} If database query fails or inputs are invalid
 */
export async function patch__discussBoard_moderator_contentReports(props: {
  moderator: ModeratorPayload;
  body: IDiscussBoardContentReport.IRequest;
}): Promise<IPageIDiscussBoardContentReport.ISummary> {
  const { body } = props;

  // Default pagination logic
  const page: number = body.page ?? 1;
  const limit: number = body.limit ?? 20;
  const skip: number = (Number(page) - 1) * Number(limit);

  // Sorting: supports 'created_at', 'status', 'reason' with optional :asc/:desc
  let orderByField: "created_at" | "status" | "reason" = "created_at";
  let orderByDirection: "asc" | "desc" = "desc";
  if (body.sort) {
    const [field, direction] = body.sort.split(":");
    if (
      (field === "created_at" || field === "status" || field === "reason") &&
      (direction === "asc" || direction === "desc")
    ) {
      orderByField = field;
      orderByDirection = direction;
    }
  }

  // Build Prisma where clause using only filters with concrete values
  const where = {
    deleted_at: null,
    ...(body.reporter_member_id !== undefined &&
      body.reporter_member_id !== null && {
        reporter_member_id: body.reporter_member_id,
      }),
    ...(body.content_type !== undefined &&
      body.content_type !== null && {
        content_type: body.content_type,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.reason !== undefined &&
      body.reason !== null && {
        reason: { contains: body.reason },
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
  };

  // Query matching rows and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_content_reports.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: limit,
      select: {
        id: true,
        content_type: true,
        status: true,
        created_at: true,
        reporter_member_id: true,
        content_post_id: true,
        content_comment_id: true,
        reason: true,
        moderation_action_id: true,
      },
    }),
    MyGlobal.prisma.discuss_board_content_reports.count({ where }),
  ]);

  // Map Prisma result to summary DTO, guarantee type branding for uuid/date-time fields
  const data = rows.map((item) => ({
    id: item.id,
    content_type: item.content_type,
    status: item.status,
    created_at: toISOStringSafe(item.created_at),
    reporter_member_id: item.reporter_member_id,
    content_post_id: item.content_post_id ?? null,
    content_comment_id: item.content_comment_id ?? null,
    reason: item.reason,
    moderation_action_id: item.moderation_action_id ?? null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
