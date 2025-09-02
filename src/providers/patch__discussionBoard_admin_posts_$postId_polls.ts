import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";
import { IPageIDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPoll";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardPollSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollSummary";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a filtered, paginated list of polls for a given postId.
 *
 * This operation returns a paginated and filterable list of all polls
 * associated with a specific post, supporting filters such as poll status
 * (open/closed), type (multi-choice), and date range. Only administrators can
 * perform this operation. Results are suitable for audit, review, or dashboard
 * integration.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user (must have admin role)
 * @param props.postId - UUID of the parent post to retrieve polls for
 * @param props.body - Filter/search/pagination options conforming to
 *   IDiscussionBoardPoll.IRequest
 * @returns Paginated list of poll summaries matching the given filters and
 *   pagination
 * @throws {Error} When user is not authorized as admin
 */
export async function patch__discussionBoard_admin_posts_$postId_polls(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPoll.IRequest;
}): Promise<IPageIDiscussionBoardPoll.ISummary> {
  const { admin, postId, body } = props;
  if (admin.type !== "admin") {
    throw new Error("Unauthorized: Admin role required");
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Build where clause, excluding soft-deleted records
  const where = {
    discussion_board_post_id: postId,
    deleted_at: null,
    ...(body.title !== undefined &&
      body.title !== null && {
        title: { contains: body.title, mode: "insensitive" as const },
      }),
    ...(body.multi_choice !== undefined &&
      body.multi_choice !== null && {
        multi_choice: body.multi_choice,
      }),
    // Date range: both created_from and created_to may exist
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

  // open_only/closed_only filter logic
  let now: (string & tags.Format<"date-time">) | undefined = undefined;
  if (body.open_only || body.closed_only) {
    now = toISOStringSafe(new Date());
  }
  let andWhere: Record<string, unknown>[] = [];
  if (body.open_only) {
    // Poll is open if opened_at <= now and (closed_at is null or closed_at > now)
    andWhere.push({
      opened_at: { lte: now },
    });
    andWhere.push({
      OR: [{ closed_at: null }, { closed_at: { gt: now } }],
    });
  }
  if (body.closed_only) {
    // Poll is closed if closed_at <= now
    andWhere.push({
      closed_at: { lte: now },
    });
  }

  // Compose full Prisma where clause with AND
  const prismaWhere =
    andWhere.length > 0 ? { AND: [where, ...andWhere] } : where;

  // Sorting
  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";

  // Query rows and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_polls.findMany({
      where: prismaWhere,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_polls.count({ where: prismaWhere }),
  ]);

  // Map to DTO and ensure all date fields are correctly stringified
  const data = rows.map((poll) => ({
    id: poll.id,
    discussion_board_post_id: poll.discussion_board_post_id,
    title: poll.title,
    multi_choice: poll.multi_choice,
    opened_at: toISOStringSafe(poll.opened_at),
    closed_at: poll.closed_at ? toISOStringSafe(poll.closed_at) : null,
    created_at: toISOStringSafe(poll.created_at),
    deleted_at: poll.deleted_at ? toISOStringSafe(poll.deleted_at) : null,
  }));

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
