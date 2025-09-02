import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";
import { IPageIDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFlagReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Search, filter, and retrieve a paginated list of all user-submitted content
 * flag reports.
 *
 * Retrieves a paginated list of flag reports submitted by users about
 * inappropriate, abusive, or policy-violating posts/comments. Allows moderators
 * and administrators to filter, sort, and search reports based on status,
 * reporter, content type, creation date, reason, and free-text search. Results
 * enable efficient moderation triage, prioritization, and regulatory workflows.
 * Soft-deleted reports are excluded. Controlled by moderator authorization.
 *
 * @param props - Request properties
 * @param props.moderator - Authenticated moderator payload. Must have type
 *   "moderator" and valid user id.
 * @param props.body - Filtering, pagination, and sorting criteria for the query
 *   (page, limit, status, contentType, reason, reporterId, createdFrom,
 *   createdTo, sortBy, sortDirection, search)
 * @returns Paginated list of flag report summaries matching the provided
 *   criteria
 * @throws {Error} If database operations fail or required data is missing
 */
export async function patch__discussionBoard_moderator_flagReports(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardFlagReport.IRequest;
}): Promise<IPageIDiscussionBoardFlagReport.ISummary> {
  const { body } = props;
  // Determine pagination
  const page =
    body.page !== undefined && body.page !== null && body.page > 0
      ? Number(body.page)
      : 1;
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit > 0
      ? Number(body.limit)
      : 20;

  // Build where filter
  const where = {
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.reason !== undefined &&
      body.reason !== null && { reason: body.reason }),
    ...(body.reporterId !== undefined &&
      body.reporterId !== null && { reporter_id: body.reporterId }),
    ...(body.createdFrom !== undefined &&
      body.createdFrom !== null && {
        created_at: {
          gte: body.createdFrom,
          ...(body.createdTo !== undefined &&
            body.createdTo !== null && { lte: body.createdTo }),
        },
      }),
    ...((body.createdFrom === undefined || body.createdFrom === null) &&
    body.createdTo !== undefined &&
    body.createdTo !== null
      ? {
          created_at: {
            lte: body.createdTo,
          },
        }
      : {}),
    ...(body.contentType === "post"
      ? { post_id: { not: null } }
      : body.contentType === "comment"
        ? { comment_id: { not: null } }
        : {}),
    ...(body.search !== undefined &&
    body.search !== null &&
    body.search.trim() !== ""
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

  // Determine sorting
  const sortBy =
    body.sortBy && typeof body.sortBy === "string" && body.sortBy.length > 0
      ? body.sortBy
      : "created_at";
  const sortDirection = body.sortDirection === "asc" ? "asc" : "desc";

  // Query results and count in parallel
  const [results, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_flag_reports.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip: (page - 1) * limit,
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

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: results.map((flag) => {
      return {
        id: flag.id,
        reporterId: flag.reporter_id,
        postId: flag.post_id !== null ? flag.post_id : undefined,
        commentId: flag.comment_id !== null ? flag.comment_id : undefined,
        reason: flag.reason,
        status: flag.status,
        createdAt: toISOStringSafe(flag.created_at),
        reviewedAt:
          flag.reviewed_at !== null && flag.reviewed_at !== undefined
            ? toISOStringSafe(flag.reviewed_at)
            : undefined,
      };
    }),
  };
}
