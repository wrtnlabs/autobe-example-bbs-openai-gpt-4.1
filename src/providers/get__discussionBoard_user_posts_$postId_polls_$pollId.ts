import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Get detailed metadata for a specific poll on a post by pollId.
 *
 * Retrieves the full details of a specific poll by pollId, including poll
 * options, vote counts, and current status (open/closed) based on poll times.
 * If the poll belongs to a soft-deleted post or itself is soft-deleted, returns
 * a compliance error. This is intended for authenticated users only and throws
 * for not found.
 *
 * All date fields are returned as ISO 8601 strings branded as string &
 * tags.Format<'date-time'>.
 *
 * @param props - Request properties
 * @param props.user - Authenticated user performing the request
 * @param props.postId - Identifier of the post this poll belongs to
 * @param props.pollId - Unique identifier of the poll to retrieve
 * @returns Poll record metadata (IDiscussionBoardPoll), date fields as branded
 *   ISO strings
 * @throws {Error} When poll not found, not connected to postId, or poll/post is
 *   soft-deleted.
 */
export async function get__discussionBoard_user_posts_$postId_polls_$pollId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  pollId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardPoll> {
  const { postId, pollId } = props;

  // Fetch poll, ensure not soft-deleted and linked to given post
  const poll = await MyGlobal.prisma.discussion_board_polls.findUnique({
    where: { id: pollId },
  });
  if (
    !poll ||
    poll.discussion_board_post_id !== postId ||
    poll.deleted_at !== null
  ) {
    throw new Error("Poll not found or not accessible");
  }

  // Ensure the parent post exists and is not soft-deleted
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: postId },
    select: { id: true, deleted_at: true },
  });
  if (!post || post.deleted_at !== null) {
    throw new Error("Parent post not found or inaccessible");
  }

  // Construct response object, converting all date fields
  return {
    id: poll.id,
    discussion_board_post_id: poll.discussion_board_post_id,
    title: poll.title,
    description: poll.description ?? null,
    multi_choice: poll.multi_choice,
    opened_at: toISOStringSafe(poll.opened_at),
    closed_at: poll.closed_at !== null ? toISOStringSafe(poll.closed_at) : null,
    created_at: toISOStringSafe(poll.created_at),
    updated_at: toISOStringSafe(poll.updated_at),
    deleted_at:
      poll.deleted_at !== null ? toISOStringSafe(poll.deleted_at) : null,
  };
}
