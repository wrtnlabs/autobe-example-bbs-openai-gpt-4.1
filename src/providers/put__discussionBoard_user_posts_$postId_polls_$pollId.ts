import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Edit an existing poll on a post. Restricted to authors, moderators, or admins
 * and not allowed if locked/closed.
 *
 * This operation allows update (edit) of an existing poll, such as changing the
 * title, description, or opening/closing the poll. Only post authors,
 * moderators, and admins can perform updates. Editing is disallowed on locked
 * or closed polls. Edits are validated for compliance with all schema
 * constraints. Upon update, changes are logged for audit/compliance. This
 * operation modifies the 'discussion_board_polls' table in accordance with
 * update semantics.
 *
 * @param props - Contains user authentication, postId (owner post UUID), pollId
 *   (poll UUID), and body (poll update payload)
 * @param props.user - The authenticated user payload (must be post author,
 *   moderator, or admin)
 * @param props.postId - UUID of the post that owns the poll to update
 * @param props.pollId - UUID of the poll to be updated
 * @param props.body - Poll update information (may specify title, description,
 *   multi_choice, opened_at, closed_at)
 * @returns The updated poll object after modification
 * @throws {Error} If poll or post not found, poll is locked/closed, or user
 *   lacks proper permissions
 */
export async function put__discussionBoard_user_posts_$postId_polls_$pollId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  pollId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPoll.IUpdate;
}): Promise<IDiscussionBoardPoll> {
  const { user, postId, pollId, body } = props;

  // Fetch poll by id and postId and not deleted
  const poll = await MyGlobal.prisma.discussion_board_polls.findFirst({
    where: {
      id: pollId,
      discussion_board_post_id: postId,
      deleted_at: null,
    },
  });
  if (!poll) throw new Error("Poll not found");

  // Fetch the parent post (for author/lock checking)
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { created_by_id: true, is_locked: true },
  });
  if (!post) throw new Error("Post not found");

  // Authorization: check if user is post author, moderator, or admin
  let isAuthorized = false;
  if (user.id === post.created_by_id) {
    isAuthorized = true;
  } else {
    // Check if user is active moderator
    const moderator =
      await MyGlobal.prisma.discussion_board_moderators.findFirst({
        where: { user_id: user.id, is_active: true, deleted_at: null },
      });
    if (moderator) isAuthorized = true;
    // If not moderator, check if user is admin
    if (!isAuthorized) {
      const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
        where: { user_id: user.id, is_active: true, deleted_at: null },
      });
      if (admin) isAuthorized = true;
    }
  }
  if (!isAuthorized)
    throw new Error(
      "Unauthorized: Only post author, moderator, or admin can update the poll",
    );

  // Check if post is locked
  if (post.is_locked)
    throw new Error("Cannot update poll: Parent post is locked");

  // Check if poll is closed (closed_at in past and closed_at not null)
  if (poll.closed_at) {
    const closedAt = toISOStringSafe(poll.closed_at);
    const now = toISOStringSafe(new Date());
    if (closedAt < now) {
      throw new Error("Cannot update poll: Poll is already closed");
    }
  }

  // Only update mutable fields (never id/discussion_board_post_id/created_at)
  const updated = await MyGlobal.prisma.discussion_board_polls.update({
    where: { id: pollId },
    data: {
      title: body.title ?? undefined,
      description: body.description ?? undefined,
      multi_choice: body.multi_choice ?? undefined,
      opened_at: body.opened_at ?? undefined,
      closed_at: body.closed_at === undefined ? undefined : body.closed_at,
      updated_at: toISOStringSafe(new Date()),
    },
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
