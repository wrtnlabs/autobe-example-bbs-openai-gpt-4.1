import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollOption";
import { IPageIDiscussionBoardPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPollOption";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List and filter poll options for a poll on a post. Moderators and admins
 * only.
 *
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
 * @param props.admin - Authenticated admin session
 * @param props.postId - Identifier of the parent post for the poll
 * @param props.pollId - Identifier of the poll whose options are to be listed
 * @param props.body - Search and pagination input for poll options attached to
 *   the given pollId
 * @returns Paginated list of poll option summaries
 * @throws {Error} When no corresponding poll exists for this pollId and postId
 *   (not implemented for performance)
 */
export async function patch__discussionBoard_admin_posts_$postId_polls_$pollId_pollOptions(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  pollId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPollOption.IRequest;
}): Promise<IPageIDiscussionBoardPollOption.ISummary> {
  const { admin, postId, pollId, body } = props;
  const {
    option_text,
    sequence,
    include_deleted,
    page = 1,
    limit = 20,
    sort_by = "sequence",
    order = "asc",
  } = body ?? {};

  const skip = (page - 1) * limit;
  const take = limit;

  const where = {
    discussion_board_poll_id: pollId,
    ...(option_text !== undefined &&
      option_text !== null &&
      option_text.length > 0 && {
        option_text: { contains: option_text, mode: "insensitive" as const },
      }),
    ...(sequence !== undefined &&
      sequence !== null && {
        sequence: sequence,
      }),
    ...(!include_deleted && { deleted_at: null }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_poll_options.findMany({
      where,
      orderBy:
        sort_by === "updated_at"
          ? { updated_at: order === "asc" ? "asc" : "desc" }
          : sort_by === "created_at"
            ? { created_at: order === "asc" ? "asc" : "desc" }
            : { sequence: order === "asc" ? "asc" : "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.discussion_board_poll_options.count({ where }),
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
      poll_id: row.discussion_board_poll_id,
      option_text: row.option_text,
      sequence: row.sequence,
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
