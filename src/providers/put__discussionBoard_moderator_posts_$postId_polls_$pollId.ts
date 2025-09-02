import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Edit an existing poll on a post.
 *
 * This operation allows a moderator to update an existing poll on a post, such
 * as changing the title, description, open/close times, or multi-choice
 * eligibility. Editing is disallowed if the poll is closed (closed_at is before
 * now) or the parent post is locked. All updates are logged for compliance.
 * Only authenticated moderators may use this endpoint (authorization handled by
 * param injection).
 *
 * @param props - The props for the poll update operation
 * @param props.moderator - ModeratorPayload injected by ModeratorAuth (JWT)
 * @param props.postId - Identifier of the post that owns this poll
 * @param props.pollId - Identifier of the poll to update
 * @param props.body - Poll update information, only including fields to be
 *   changed
 * @returns The updated poll object after modification
 * @throws {Error} If poll or post is not found, is locked, or poll is already
 *   closed
 */
export async function put__discussionBoard_moderator_posts_$postId_polls_$pollId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  pollId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPoll.IUpdate;
}): Promise<IDiscussionBoardPoll> {
  const { moderator, postId, pollId, body } = props;

  // Fetch the poll to update
  const poll = await MyGlobal.prisma.discussion_board_polls.findFirst({
    where: {
      id: pollId,
      discussion_board_post_id: postId,
      deleted_at: null,
    },
  });
  if (!poll) {
    throw new Error("Poll not found or already deleted");
  }

  // Business logic: disallow edit if poll is closed (closed_at before now), allow if closed_at is null or in future
  if (poll.closed_at) {
    // Convert both to ISO strings for safe comparison
    const closedAt = toISOStringSafe(poll.closed_at);
    const now = toISOStringSafe(new Date());
    if (closedAt <= now) {
      throw new Error("Poll is closed and cannot be edited");
    }
  }

  // Fetch the post to check that it exists and is not locked
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new Error("Post not found or already deleted");
  }
  if (post.is_locked) {
    throw new Error("Post is locked and poll cannot be updated");
  }

  // Prepare poll update data
  // closed_at: if set to undefined, omit; if null, set to null; if provided, set to value; else skip
  const updateData: {
    title?: string;
    description?: string;
    multi_choice?: boolean;
    opened_at?: string & tags.Format<"date-time">;
    closed_at?: (string & tags.Format<"date-time">) | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    title: body.title ?? undefined,
    description: body.description ?? undefined,
    multi_choice: body.multi_choice ?? undefined,
    opened_at: body.opened_at ?? undefined,
    // closed_at: include if set, even if null (explicitly clear close date)
    ...(body.closed_at !== undefined ? { closed_at: body.closed_at } : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.discussion_board_polls.update({
    where: { id: pollId },
    data: updateData,
  });

  return {
    id: updated.id,
    discussion_board_post_id: updated.discussion_board_post_id,
    title: updated.title,
    description: updated.description ?? null,
    multi_choice: updated.multi_choice,
    opened_at: toISOStringSafe(updated.opened_at),
    closed_at: updated.closed_at ? toISOStringSafe(updated.closed_at) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
