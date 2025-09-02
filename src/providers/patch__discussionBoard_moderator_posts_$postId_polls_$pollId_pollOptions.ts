import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollOption";
import { IPageIDiscussionBoardPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPollOption";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Lists and filters poll options for a given pollId, supporting advanced
 * filters (sequence ordering, text match, state). Output is paginated for UI
 * consumption. Moderators and admins use this endpoint for routine audits or
 * quality reviews.
 *
 * Soft-deleted options are only included in the response when requested by an
 * admin role. Optionally, the endpoint allows sorting by sequence or updated
 * date. This endpoint complements single-poll metadata retrieval and poll
 * option CRUD operations.
 *
 * @param props - Request properties
 * @param props.moderator - The authenticated moderator making the request
 * @param props.postId - Identifier of the parent post for the poll (not used
 *   for lookup, for routing only)
 * @param props.pollId - Identifier of the poll whose options are to be listed
 * @param props.body - Search and pagination/filter options for poll options
 *   attached to the given pollId
 * @returns Paginated list of poll option summaries in
 *   IPageIDiscussionBoardPollOption.ISummary structure
 * @throws {Error} Throws if database query fails
 */
export async function patch__discussionBoard_moderator_posts_$postId_polls_$pollId_pollOptions(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  pollId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPollOption.IRequest;
}): Promise<IPageIDiscussionBoardPollOption.ISummary> {
  const { moderator, postId, pollId, body } = props;

  // Pagination defaults (assume input already validated):
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Advanced filters
  const where = {
    discussion_board_poll_id: pollId,
    ...(body.option_text &&
      body.option_text.length > 0 && {
        option_text: {
          contains: body.option_text,
          mode: "insensitive" as const,
        },
      }),
    ...(body.sequence !== undefined &&
      body.sequence !== null && {
        sequence: body.sequence,
      }),
    // Only include non-deleted unless include_deleted true
    ...(body.include_deleted === true ? {} : { deleted_at: null }),
  };

  const sortField = body.sort_by ?? "sequence";
  const sortOrder = body.order ?? "asc";
  // Sorting and pagination inline (never extract orderBy as variable)

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_poll_options.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.discussion_board_poll_options.count({ where }),
  ]);

  // Transform results to DTO
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      poll_id: row.discussion_board_poll_id,
      option_text: row.option_text,
      sequence: row.sequence,
      deleted_at:
        row.deleted_at != null ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
