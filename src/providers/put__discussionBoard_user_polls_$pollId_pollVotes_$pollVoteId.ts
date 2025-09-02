import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPollVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollVote";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update a poll vote (moderator/admin override or correction).
 *
 * This endpoint allows a user to update their poll vote for a specific poll,
 * provided the vote is theirs, the poll is open (not closed or deleted), and
 * only one option is selected (per schema restrictions). Only the vote owner
 * can update their vote through this endpoint.
 *
 * - Forbids update if the vote record, poll, or options do not exist, are
 *   deleted, or if the poll is closed.
 * - Enforces single-option-per-vote (as per schema): throws if multiple options
 *   are provided in input.
 * - Idempotent: if the selected option matches the current, operation is a no-op
 *   and returns current data.
 * - Does NOT use Date objects or type assertions (`as`) anywhere; all types are
 *   safe and strictly branded.
 *
 * @param props - Request properties including authenticated user, pollId,
 *   pollVoteId, and update body.
 * @param props.user - Authenticated user making the request.
 * @param props.pollId - UUID of the poll containing the vote.
 * @param props.pollVoteId - UUID of the poll vote to update.
 * @param props.body - Update body containing new selected option.
 * @returns The updated poll vote record conforming to IDiscussionBoardPollVote.
 * @throws {Error} When the vote or poll does not exist, user is unauthorized,
 *   poll is closed/deleted, input is invalid, or any access is forbidden.
 */
export async function put__discussionBoard_user_polls_$pollId_pollVotes_$pollVoteId(props: {
  user: UserPayload;
  pollId: string & tags.Format<"uuid">;
  pollVoteId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPollVote.IUpdate;
}): Promise<IDiscussionBoardPollVote> {
  const { user, pollId, pollVoteId, body } = props;

  // Fetch the poll vote by ID
  const pollVote = await MyGlobal.prisma.discussion_board_poll_votes.findUnique(
    {
      where: { id: pollVoteId },
    },
  );
  if (!pollVote) throw new Error("Poll vote not found");
  if (pollVote.deleted_at) throw new Error("Poll vote has been deleted");
  if (pollVote.discussion_board_poll_id !== pollId)
    throw new Error("Poll vote does not match poll");

  // Authorization: Only the owner (user) can update
  if (pollVote.discussion_board_user_id !== user.id) {
    throw new Error(
      "Unauthorized: Only the vote owner may update their poll vote",
    );
  }

  // Fetch the poll to assess poll status (closed, deleted)
  const poll = await MyGlobal.prisma.discussion_board_polls.findUnique({
    where: { id: pollId },
  });
  if (!poll) throw new Error("Poll not found");
  if (poll.deleted_at) throw new Error("Poll is deleted");
  if (poll.closed_at)
    throw new Error("Poll is closed, votes may not be modified");

  // Validate input: only one option allowed (schema limitation)
  if (!body.newOptionIds || body.newOptionIds.length !== 1) {
    throw new Error("Exactly one option must be selected for update");
  }

  const newOptionId = body.newOptionIds[0];
  // Idempotency: No update needed if option matches current
  if (pollVote.discussion_board_poll_option_id === newOptionId) {
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

  // Proceed to update the poll_vote record
  const updated = await MyGlobal.prisma.discussion_board_poll_votes.update({
    where: { id: pollVote.id },
    data: {
      discussion_board_poll_option_id: newOptionId,
    },
  });

  return {
    id: updated.id,
    discussion_board_poll_id: updated.discussion_board_poll_id,
    discussion_board_poll_option_id: updated.discussion_board_poll_option_id,
    discussion_board_user_id: updated.discussion_board_user_id,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
