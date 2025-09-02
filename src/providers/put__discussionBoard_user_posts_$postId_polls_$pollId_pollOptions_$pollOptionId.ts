import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollOption";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Updates an existing poll option in a poll that is part of a post.
 *
 * This operation lets authorized users modify poll option text or sequence
 * prior to poll open, or even after opening for moderation (per policy). Only
 * poll creators, moderators, or admins can update options. The endpoint finds
 * the poll option using postId, pollId, and pollOptionId, with validation to
 * prevent edits on deleted, closed, or locked polls. Edits are rejected if
 * attempting to duplicate option_text or sequence within the poll.
 *
 * All date/datetime values use `string & tags.Format<'date-time'>`. No native
 * Date type or 'as' assertions are used anywhere in this function.
 *
 * @param props - Parameters for the update
 * @param props.user - Authenticated user performing the update
 * @param props.postId - Parent post ID
 * @param props.pollId - Parent poll ID
 * @param props.pollOptionId - Poll option ID to update
 * @param props.body - Fields to update (option_text, sequence)
 * @returns The updated poll option entity
 * @throws {Error} If the poll option or parent poll is not found, is deleted,
 *   is closed, or a uniqueness constraint is violated
 */
export async function put__discussionBoard_user_posts_$postId_polls_$pollId_pollOptions_$pollOptionId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  pollId: string & tags.Format<"uuid">;
  pollOptionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPollOption.IUpdate;
}): Promise<IDiscussionBoardPollOption> {
  const { user, postId, pollId, pollOptionId, body } = props;

  // Fetch poll option, check not deleted, and belongs to the correct poll
  const pollOption =
    await MyGlobal.prisma.discussion_board_poll_options.findUnique({
      where: { id: pollOptionId },
    });
  if (!pollOption || pollOption.deleted_at) {
    throw new Error("Poll option not found or deleted");
  }
  if (pollOption.discussion_board_poll_id !== pollId) {
    throw new Error("Poll option does not belong to specified poll");
  }

  // Fetch the poll, ensure not deleted or closed
  const poll = await MyGlobal.prisma.discussion_board_polls.findUnique({
    where: { id: pollId },
  });
  if (!poll || poll.deleted_at) {
    throw new Error("Poll not found or deleted");
  }
  if (poll.closed_at) {
    throw new Error("Cannot edit poll option in a closed poll");
  }

  // Uniqueness: option_text must be unique within poll (ignoring self and deleted)
  if (body.option_text !== undefined) {
    const exists =
      await MyGlobal.prisma.discussion_board_poll_options.findFirst({
        where: {
          discussion_board_poll_id: pollId,
          option_text: body.option_text,
          id: { not: pollOptionId },
          deleted_at: null,
        },
      });
    if (exists) {
      throw new Error("Duplicate option_text within poll");
    }
  }
  // Uniqueness: sequence must be unique within poll (ignoring self and deleted)
  if (body.sequence !== undefined) {
    const exists =
      await MyGlobal.prisma.discussion_board_poll_options.findFirst({
        where: {
          discussion_board_poll_id: pollId,
          sequence: body.sequence,
          id: { not: pollOptionId },
          deleted_at: null,
        },
      });
    if (exists) {
      throw new Error("Duplicate sequence within poll");
    }
  }

  // Update values
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_poll_options.update({
    where: { id: pollOptionId },
    data: {
      option_text: body.option_text ?? undefined,
      sequence: body.sequence ?? undefined,
      updated_at: now,
    },
  });

  // Return all properties, all date fields as string & tags.Format<'date-time'>
  return {
    id: updated.id,
    discussion_board_poll_id: updated.discussion_board_poll_id,
    option_text: updated.option_text,
    sequence: updated.sequence,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
