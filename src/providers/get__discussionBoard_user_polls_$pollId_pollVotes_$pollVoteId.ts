import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPollVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollVote";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieves the details of a specific poll vote by ID for a given poll.
 *
 * Used for showing a user's own voting record, for audit or moderator review,
 * or for systems that support voting transparency. Requires pollId and
 * pollVoteId for precise identification. Only the vote owner (current user) may
 * view their vote in this endpoint.
 *
 * Only the vote owner may retrieve this record. If the vote does not exist, is
 * soft-deleted, or does not belong to the requester, appropriate errors are
 * thrown to maintain privacy. Moderation/admin access is not supported by this
 * endpoint.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user making the request (must have
 *   standard user privileges)
 * @param props.pollId - The unique identifier (UUID) for the poll to which this
 *   vote belongs
 * @param props.pollVoteId - The unique identifier (UUID) of the specific poll
 *   vote to retrieve
 * @returns The poll vote record, strictly typed and date values stringified, or
 *   throws if access is not allowed
 * @throws {Error} If the poll vote does not exist or is soft-deleted
 * @throws {Error} If the current user does not own the poll vote (forbidden)
 */
export async function get__discussionBoard_user_polls_$pollId_pollVotes_$pollVoteId(props: {
  user: UserPayload;
  pollId: string & tags.Format<"uuid">;
  pollVoteId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardPollVote> {
  const { user, pollId, pollVoteId } = props;

  const pollVote = await MyGlobal.prisma.discussion_board_poll_votes.findFirst({
    where: {
      id: pollVoteId,
      discussion_board_poll_id: pollId,
      deleted_at: null,
    },
  });
  if (!pollVote) {
    throw new Error("Poll vote not found");
  }
  if (pollVote.discussion_board_user_id !== user.id) {
    throw new Error(
      "Forbidden: You do not have permission to view this poll vote",
    );
  }
  return {
    id: pollVote.id,
    discussion_board_poll_id: pollVote.discussion_board_poll_id,
    discussion_board_poll_option_id: pollVote.discussion_board_poll_option_id,
    discussion_board_user_id: pollVote.discussion_board_user_id,
    created_at: toISOStringSafe(pollVote.created_at),
    deleted_at: pollVote.deleted_at
      ? toISOStringSafe(pollVote.deleted_at)
      : null,
  };
}
