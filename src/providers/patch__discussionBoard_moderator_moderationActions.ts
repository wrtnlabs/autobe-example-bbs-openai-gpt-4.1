import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Search and review moderation actions taken on posts, users, and comments.
 *
 * Fetch a paginated and optionally filtered list of all moderation actions,
 * such as removal, warning, edit, restrict, restore, or escalate, performed by
 * moderators and admins. Enables management and review of platform moderation
 * events for auditability and staff training.
 *
 * The list supports filtering by actor (moderator), target user/content, date
 * window, and action type. This is a privileged endpoint requiring at least
 * moderator role.
 *
 * @param props - Request properties
 * @param props.moderator - The authenticated moderator making the request
 * @param props.body - Pagination, filter, and search parameters
 * @returns Paginated moderation action summaries matching search criteria.
 * @throws {Error} If an invalid sort field is provided
 */
export async function patch__discussionBoard_moderator_moderationActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationAction.IRequest;
}): Promise<IPageIDiscussionBoardModerationAction.ISummary> {
  const { body } = props;
  // Only allow sortBy on specific, known, safe fields
  const safeSortKeys = [
    "created_at",
    "action_type",
    "action_reason",
    "updated_at",
  ] as const;
  const sortBy: (typeof safeSortKeys)[number] =
    body.sortBy &&
    safeSortKeys.includes(body.sortBy as (typeof safeSortKeys)[number])
      ? (body.sortBy as (typeof safeSortKeys)[number])
      : "created_at";
  const sortDirection: "asc" | "desc" =
    body.sortDirection === "asc" ? "asc" : "desc";
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);

  const where = {
    deleted_at: null,
    ...(body.actionType && { action_type: body.actionType }),
    ...(body.moderatorId && { moderator_id: body.moderatorId }),
    ...(body.userId && { user_id: body.userId }),
    ...(body.postId && { post_id: body.postId }),
    ...(body.commentId && { comment_id: body.commentId }),
    ...(body.effectiveFrom && { effective_from: { gte: body.effectiveFrom } }),
    ...(body.effectiveUntil && {
      effective_until: { lte: body.effectiveUntil },
    }),
    ...((body.createdFrom || body.createdTo) && {
      created_at: {
        ...(body.createdFrom && { gte: body.createdFrom }),
        ...(body.createdTo && { lte: body.createdTo }),
      },
    }),
    ...(body.search && {
      OR: [
        {
          action_reason: {
            contains: body.search,
            mode: "insensitive" as const,
          },
        },
        { details: { contains: body.search, mode: "insensitive" as const } },
      ],
    }),
  };

  // Pagination (note: Prisma's skip is 0-based)
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_actions.count({ where }),
    MyGlobal.prisma.discussion_board_moderation_actions.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        moderator_id: true,
        user_id: true,
        post_id: true,
        comment_id: true,
        action_type: true,
        action_reason: true,
        created_at: true,
        deleted_at: true,
      },
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    moderator_id: row.moderator_id,
    user_id: row.user_id ?? null,
    post_id: row.post_id ?? null,
    comment_id: row.comment_id ?? null,
    action_type:
      row.action_type as IDiscussionBoardModerationAction.ISummary["action_type"],
    action_reason: row.action_reason,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: limit === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
