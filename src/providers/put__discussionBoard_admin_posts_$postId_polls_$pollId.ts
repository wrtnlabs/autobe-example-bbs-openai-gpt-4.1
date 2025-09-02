import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Edit an existing poll on a post.
 *
 * Allows an admin to update an existing poll (title, description, voting
 * window, etc.) on a specific post. Only permitted for admins; the poll must
 * exist, belong to the specified post, not be soft-deleted, and be open for
 * edits. Editing is prevented on locked posts or closed polls (poll.closed_at
 * in the past). All updates refresh the poll's updated_at timestamp and are
 * only allowed if business rules permit.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the update
 * @param props.postId - UUID of the post that owns the poll
 * @param props.pollId - UUID of the poll to update
 * @param props.body - Update data for the poll
 * @returns The updated poll record with all fields properly converted
 * @throws {Error} When the poll or post is not found, locked, closed, or does
 *   not match the IDs provided
 */
export async function put__discussionBoard_admin_posts_$postId_polls_$pollId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  pollId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPoll.IUpdate;
}): Promise<IDiscussionBoardPoll> {
  const { admin, postId, pollId, body } = props;

  // 1. Fetch poll, ensure it exists, belongs to correct post, not deleted
  const poll = await MyGlobal.prisma.discussion_board_polls.findFirst({
    where: {
      id: pollId,
      deleted_at: null,
    },
  });
  if (!poll) throw new Error("Poll not found");
  if (poll.discussion_board_post_id !== postId) {
    throw new Error("Poll does not belong to the specified post");
  }

  // 2. Fetch post, check lock status
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });
  if (!post) throw new Error("Post not found");
  if (post.is_locked) throw new Error("Editing not allowed on locked posts");

  // 3. If poll.closed_at != null and in the past, editing not allowed
  if (
    poll.closed_at &&
    (typeof poll.closed_at === "string"
      ? new Date(poll.closed_at)
      : poll.closed_at) < new Date()
  ) {
    throw new Error("Editing not allowed on closed polls");
  }

  // 4. Update poll, only pass changed fields, always update updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_polls.update({
    where: { id: pollId },
    data: {
      title: body.title ?? undefined,
      description: body.description ?? undefined,
      multi_choice: body.multi_choice ?? undefined,
      opened_at:
        body.opened_at !== undefined && body.opened_at !== null
          ? toISOStringSafe(body.opened_at)
          : undefined,
      closed_at:
        body.closed_at !== undefined
          ? body.closed_at === null
            ? null
            : toISOStringSafe(body.closed_at)
          : undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    discussion_board_post_id: updated.discussion_board_post_id,
    title: updated.title,
    description:
      updated.description !== undefined && updated.description !== null
        ? updated.description
        : null,
    multi_choice: updated.multi_choice,
    opened_at: toISOStringSafe(updated.opened_at),
    closed_at:
      updated.closed_at !== undefined && updated.closed_at !== null
        ? toISOStringSafe(updated.closed_at)
        : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== undefined && updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
