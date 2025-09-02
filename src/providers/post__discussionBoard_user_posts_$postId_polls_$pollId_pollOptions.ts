import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollOption";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Creates a new poll option within an existing poll attached to a post.
 *
 * This endpoint allows authenticated users to add a new choice to a poll they
 * created, provided the poll is open and the option is unique within the poll.
 * Sequence and label must not duplicate existing options. Only the poll creator
 * can perform this action (moderator/admin control is separate). Option cannot
 * be added if the poll is closed or deleted.
 *
 * @param props - Request parameters
 * @param props.user - The authenticated user (must be poll creator)
 * @param props.postId - Unique identifier for the parent post
 * @param props.pollId - Unique identifier for the poll
 * @param props.body - Details needed to create a new poll option (label,
 *   sequence)
 * @returns The created poll option, with all fields populated
 * @throws {Error} When the poll or post does not exist, is deleted, or
 *   mismatched
 * @throws {Error} When the poll is closed for option creation
 * @throws {Error} When the user is not authorized (not poll creator)
 * @throws {Error} When the option label or sequence already exists within the
 *   poll
 */
export async function post__discussionBoard_user_posts_$postId_polls_$pollId_pollOptions(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  pollId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPollOption.ICreate;
}): Promise<IDiscussionBoardPollOption> {
  const { user, postId, pollId, body } = props;

  // Step 1: Validate poll existence, ownership, not deleted, matches post
  const poll = await MyGlobal.prisma.discussion_board_polls.findFirst({
    where: {
      id: pollId,
      deleted_at: null,
    },
  });
  if (!poll) {
    throw new Error("Poll not found or has been deleted.");
  }
  if (poll.discussion_board_post_id !== postId) {
    throw new Error("Poll does not belong to the specified post.");
  }

  // Step 2: Validate the post exists and was created by the user
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new Error("Post not found or has been deleted.");
  }
  if (post.created_by_id !== user.id) {
    throw new Error("Only the poll creator may add poll options.");
  }

  // Step 3: Poll must not be closed (closed_at: null or in the future)
  if (poll.closed_at) {
    const closedIso = toISOStringSafe(poll.closed_at);
    const nowIso = toISOStringSafe(new Date());
    if (closedIso <= nowIso) {
      throw new Error("Poll is closed; cannot add new options.");
    }
  }

  // Step 4: Uniqueness checks for option_text and sequence in this poll (excluding soft-deleted)
  const [optionTextExists, sequenceExists] = await Promise.all([
    MyGlobal.prisma.discussion_board_poll_options.findFirst({
      where: {
        discussion_board_poll_id: pollId,
        option_text: body.option_text,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.discussion_board_poll_options.findFirst({
      where: {
        discussion_board_poll_id: pollId,
        sequence: body.sequence,
        deleted_at: null,
      },
    }),
  ]);
  if (optionTextExists) {
    throw new Error("Option text must be unique within this poll.");
  }
  if (sequenceExists) {
    throw new Error("Sequence must be unique within this poll.");
  }

  // Step 5: Create the poll option
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discussion_board_poll_options.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_poll_id: pollId,
      option_text: body.option_text,
      sequence: body.sequence,
      created_at: now,
      updated_at: now,
    },
  });

  // Step 6: Return the poll option using the correct API format
  return {
    id: created.id,
    discussion_board_poll_id: created.discussion_board_poll_id,
    option_text: created.option_text,
    sequence: created.sequence,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
