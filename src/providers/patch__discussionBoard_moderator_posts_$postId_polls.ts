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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieve a filtered, paginated list of polls for a given postId.
 *
 * Returns a paginated and filterable list of all polls associated with a
 * specific post, supporting filters such as poll status, type, and date range.
 * This endpoint is intended primarily for moderators and admins for the purpose
 * of audit, review, or bulk analysis rather than regular users.
 *
 * Access enforcement ensures that only privileged roles (moderator, admin) can
 * perform bulk retrieval or search of poll data on posts. Payloads are
 * optimized for both search/sort and for integration with UI dashboards.
 *
 * If there are no polls for the post, an empty result set is returned with
 * pagination metadata. This endpoint complements single poll GETs and poll
 * management operations.
 *
 * @param props - Request properties
 * @param props.moderator - The authenticated moderator performing the operation
 * @param props.postId - Identifier of the parent post to retrieve polls for
 * @param props.body - Search, filter, and pagination options for polls
 *   associated with the postId
 * @returns Paginated list of poll summaries for the target post
 * @throws {Error} If database errors occur
 */
export async function patch__discussionBoard_moderator_posts_$postId_polls(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPoll.IRequest;
}): Promise<IPageIDiscussionBoardPoll.ISummary> {
  const { postId, body } = props;

  // Unconditionally enforce soft-delete for queries
  // Required: only fetch for this post
  // Prepare filters/pagination
  const now = toISOStringSafe(new Date());
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Where clause: build base and add conditional clauses
  const baseWhere = {
    deleted_at: null,
    discussion_board_post_id: postId,
  };

  // Dynamic search filters
  const where = {
    ...baseWhere,
    ...(body.title && {
      title: { contains: body.title, mode: "insensitive" as const },
    }),
    ...(body.multi_choice !== undefined && { multi_choice: body.multi_choice }),
    // created_at: both from/to (date range)
    ...(body.created_from || body.created_to
      ? {
          created_at: {
            ...(body.created_from && { gte: body.created_from }),
            ...(body.created_to && { lte: body.created_to }),
          },
        }
      : {}),
    // Open/closed status logic
    ...(body.open_only
      ? {
          opened_at: { lte: now },
          OR: [{ closed_at: null }, { closed_at: { gt: now } }],
        }
      : {}),
    ...(body.closed_only
      ? {
          closed_at: { lte: now, not: null },
        }
      : {}),
  };

  // Sorting configuration
  const allowedSortFields = ["created_at", "opened_at", "closed_at", "title"];
  const sortField = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Pagination calculation
  const skip = (page - 1) * limit;

  // Query for records and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_polls.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_polls.count({ where }),
  ]);

  // Map each poll to IDiscussionBoardPollSummary, converting all Date fields
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
