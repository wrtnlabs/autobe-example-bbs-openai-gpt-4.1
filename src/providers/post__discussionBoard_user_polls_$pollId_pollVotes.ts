import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPollVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollVote";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Records a user's vote for one or more poll options in an existing poll.
 *
 * Enforces all participation rules (single/multi-choice, no duplicate votes,
 * eligibility). Creates a row in discussion_board_poll_votes for each selected
 * option (if eligible). Only authenticated users who have NOT already voted for
 * their chosen options are permitted. Validates poll existence, open/closed
 * state, option validity, and prevents duplicate voting. Returns the first
 * created vote record as confirmation (per API contract). All date fields use
 * string & tags.Format<'date-time'> (no native Date).
 *
 * @param props - Request properties
 * @param props.user - The authenticated user issuing the vote
 * @param props.pollId - Unique identifier for the poll
 * @param props.body - Describes the options the user has selected (optionIds[])
 * @returns The created poll vote record (the first vote, matching DTO contract)
 * @throws {Error} When the poll is not found, closed, or deleted
 * @throws {Error} When any selected option is not valid for this poll or is
 *   deleted
 * @throws {Error} When attempting duplicate vote for the same poll/option
 * @throws {Error} When multi-/single-choice constraints are violated
 */
export async function post__discussionBoard_user_polls_$pollId_pollVotes(props: {
  user: UserPayload;
  pollId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPollVote.ICreate;
}): Promise<IDiscussionBoardPollVote> {
  const { user, pollId, body } = props;

  // Fetch poll and check for open state / not deleted
  const poll = await MyGlobal.prisma.discussion_board_polls.findFirst({
    where: {
      id: pollId,
      deleted_at: null,
      closed_at: null,
    },
  });
  if (!poll) {
    throw new Error("Poll not found, closed, or has been deleted");
  }

  // Fetch all active poll options for this poll
  const options = await MyGlobal.prisma.discussion_board_poll_options.findMany({
    where: {
      discussion_board_poll_id: pollId,
      deleted_at: null,
    },
  });
  const validOptionIds = new Set(options.map((opt) => opt.id));
  for (const optionId of body.optionIds) {
    if (!validOptionIds.has(optionId)) {
      throw new Error("Invalid option selected for this poll");
    }
  }

  // Enforce single/multi-choice rules
  if (!poll.multi_choice) {
    if (body.optionIds.length !== 1) {
      throw new Error("This poll is single-choice. Select only one option.");
    }
  } else {
    if (body.optionIds.length < 1) {
      throw new Error(
        "Must select at least one option for a multi-choice poll.",
      );
    }
  }

  // For each selected option, prevent duplicate voting for (poll, option, user)
  for (const optionId of body.optionIds) {
    const existing =
      await MyGlobal.prisma.discussion_board_poll_votes.findFirst({
        where: {
          discussion_board_poll_id: pollId,
          discussion_board_poll_option_id: optionId,
          discussion_board_user_id: user.id,
          deleted_at: null,
        },
      });
    if (existing) {
      throw new Error(
        "Duplicate vote not allowed for one or more selected options.",
      );
    }
  }

  // Create a vote for each optionId. Return the first created vote per API/contract.
  const now = toISOStringSafe(new Date());
  let firstVote: IDiscussionBoardPollVote | null = null;
  for (const optionId of body.optionIds) {
    const created = await MyGlobal.prisma.discussion_board_poll_votes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_poll_id: pollId,
        discussion_board_poll_option_id: optionId,
        discussion_board_user_id: user.id,
        created_at: now,
        // deleted_at omitted (active)
      },
    });
    if (!firstVote) {
      // All returned properties are correct except created_at/deleted_at (convert to string)
      firstVote = {
        id: created.id,
        discussion_board_poll_id: created.discussion_board_poll_id,
        discussion_board_poll_option_id:
          created.discussion_board_poll_option_id,
        discussion_board_user_id: created.discussion_board_user_id,
        created_at: toISOStringSafe(created.created_at),
        deleted_at: created.deleted_at
          ? toISOStringSafe(created.deleted_at)
          : null,
      };
    }
  }

  // Contract is to return the first created vote for the batch
  if (!firstVote) {
    throw new Error("Vote creation failed unexpectedly.");
  }
  return firstVote;
}
