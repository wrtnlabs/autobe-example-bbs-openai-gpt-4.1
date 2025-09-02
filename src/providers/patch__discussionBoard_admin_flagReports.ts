import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";
import { IPageIDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFlagReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search, filter, and retrieve a paginated list of all user-submitted content
 * flag reports.
 *
 * This endpoint allows admins to filter content flag reports by status,
 * reporter, content type (post/comment), creation date, reason, and keyword
 * search. Supports sorting, pagination, and excludes all soft-deleted records
 * (deleted_at != null).
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user performing the search
 * @param props.body - Filtering, pagination, sorting, and search criteria for
 *   the flag report search
 * @returns Paginated list of flag report summaries matching the criteria
 * @throws {Error} When user is not authorized or a database error occurs
 */
export async function patch__discussionBoard_admin_flagReports(props: {
  admin: AdminPayload;
  body: IDiscussionBoardFlagReport.IRequest;
}): Promise<IPageIDiscussionBoardFlagReport.ISummary> {
  const { admin, body } = props;
  // Authorization is already performed upstream by AdminAuth (see scenario)
  // All filter, pagination, and sort values are interpreted from body

  // Defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Dynamic where clause construction (critical: deleted_at always null by default)
  const where = {
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.reporterId !== undefined &&
      body.reporterId !== null && { reporter_id: body.reporterId }),
    ...(body.contentType === "post" && { comment_id: null }),
    ...(body.contentType === "comment" && { post_id: null }),
    ...(body.reason !== undefined &&
      body.reason !== null && { reason: body.reason }),
    ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
    (body.createdTo !== undefined && body.createdTo !== null)
      ? {
          created_at: {
            ...(body.createdFrom !== undefined &&
              body.createdFrom !== null && { gte: body.createdFrom }),
            ...(body.createdTo !== undefined &&
              body.createdTo !== null && { lte: body.createdTo }),
          },
        }
      : {}),
    ...(body.search !== undefined && body.search.length > 0
      ? {
          OR: [
            { reason: { contains: body.search, mode: "insensitive" as const } },
            {
              details: { contains: body.search, mode: "insensitive" as const },
            },
          ],
        }
      : {}),
  };

  // Map sortBy to schema fields (default/fallback to created_at)
  let sortBy: string;
  if (body.sortBy === "createdAt") sortBy = "created_at";
  else if (body.sortBy === "status") sortBy = "status";
  else sortBy = "created_at";
  const sortDirection = body.sortDirection === "asc" ? "asc" : "desc";

  // Parallel data fetch: paginated rows + total count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_flag_reports.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip,
      take: limit,
      select: {
        id: true,
        reporter_id: true,
        post_id: true,
        comment_id: true,
        reason: true,
        status: true,
        created_at: true,
        reviewed_at: true,
      },
    }),
    MyGlobal.prisma.discussion_board_flag_reports.count({ where }),
  ]);

  // Map database output to ISummary DTO (date conversions required)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: records.map((r) => {
      return {
        id: r.id,
        reporterId: r.reporter_id,
        postId: r.post_id ?? undefined,
        commentId: r.comment_id ?? undefined,
        reason: r.reason,
        status: r.status,
        createdAt: toISOStringSafe(r.created_at),
        ...(r.reviewed_at !== null &&
          r.reviewed_at !== undefined && {
            reviewedAt: toISOStringSafe(r.reviewed_at),
          }),
      };
    }),
  };
}
