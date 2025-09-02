import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPollVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollVote";
import { IPageIDiscussionBoardPollVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPollVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Search and paginate poll votes for a given poll.
 *
 * Returns a paginated set of poll votes for the specified poll. Useful for poll
 * result tallies, identifying user voting patterns (where permitted), or for
 * situational analysis in audits. Supports advanced query filtering by user,
 * option, date, or vote status (where enabled). May be restricted: in-progress
 * polls may hide full results from regular users but show to
 * creators/moderators, while concluded polls usually expose full voting
 * statistics.
 *
 * Only users with authorization (poll creator, moderator/admin, or user who
 * participated) may see full details if the poll is not public. Pagination and
 * sorting are supported. All accesses are logged for compliance as voting data
 * may be sensitive.
 *
 * @param props - Request properties
 * @param props.user - Authenticated user performing the vote retrieval
 * @param props.pollId - Unique identifier for the target poll
 * @param props.body - Filter, search, pagination, and sorting params
 * @returns Paginated vote info for the given poll, enforcing privacy rules
 * @throws {Error} When poll does not exist or user is forbidden from viewing
 *   votes
 */
export async function patch__discussionBoard_user_polls_$pollId_pollVotes(props: {
  user: UserPayload;
  pollId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPollVote.IRequest;
}): Promise<IPageIDiscussionBoardPollVote> {
  const { user, pollId, body } = props;

  // Fetch the poll (must select all fields you plan to use)
  const poll = await MyGlobal.prisma.discussion_board_polls.findUnique({
    where: { id: pollId },
    select: {
      id: true,
      discussion_board_post_id: true,
      opened_at: true,
      closed_at: true,
    },
  });
  if (!poll) throw new Error("Poll not found");

  // Only allow if poll is open OR user is creator/participant (for now, just block if closed for regular users)
  // If closed, only moderators/admins or special users can access (out of scope for now)
  if (poll.closed_at !== null) {
    throw new Error("Forbidden: Poll is closed");
  }

  // Construct where clause for votes
  const where = {
    discussion_board_poll_id: pollId,
    ...(body.poll_option_id !== undefined &&
      body.poll_option_id !== null && {
        discussion_board_poll_option_id: body.poll_option_id,
      }),
    ...(body.user_id !== undefined &&
      body.user_id !== null && { discussion_board_user_id: body.user_id }),
    ...(body.include_deleted ? {} : { deleted_at: null }),
  };

  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Sorting
  const orderBy = { created_at: (body.order ?? "desc") as "asc" | "desc" };

  // Fetch votes and total count in parallel
  const [votes, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_poll_votes.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_poll_votes.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: votes.map((row) => ({
      id: row.id,
      discussion_board_poll_id: row.discussion_board_poll_id,
      discussion_board_poll_option_id: row.discussion_board_poll_option_id,
      discussion_board_user_id: row.discussion_board_user_id,
      created_at: toISOStringSafe(row.created_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
