import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Soft delete a poll option (remove from voting, keep for audit).
 *
 * Performs a soft deletion of a specific poll option. Once deleted, the option
 * becomes unavailable for user voting but remains in the database for
 * regulatory and audit purposes. Only authorized actors (poll creator,
 * moderator, or admin) may perform deletions. Poll status is checked: options
 * may only be deleted pre-poll open or by privileged roles post-open in the
 * case of abuse, error, or compliance needs.
 *
 * A deleted poll option cannot be restored via this API; a new option must be
 * created in its place. The endpoint audits all operations for compliance and
 * may trigger notifications depending on notification policy. Errors from
 * trying to delete options in active, locked, or non-existing polls will return
 * explicit business error codes.
 *
 * @param props - Request properties
 * @param props.user - Authenticated user payload (must be poll creator)
 * @param props.postId - Unique identifier for the parent post
 * @param props.pollId - Unique identifier for the parent poll
 * @param props.pollOptionId - Unique identifier for the poll option to be
 *   deleted
 * @returns Void
 * @throws {Error} When poll option is not found, already deleted, user lacks
 *   permission, or poll/post state prohibits deletion
 */
export async function delete__discussionBoard_user_posts_$postId_polls_$pollId_pollOptions_$pollOptionId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  pollId: string & tags.Format<"uuid">;
  pollOptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, postId, pollId, pollOptionId } = props;

  // 1. Fetch poll option and verify existence/not already deleted
  const pollOption =
    await MyGlobal.prisma.discussion_board_poll_options.findUnique({
      where: { id: pollOptionId },
    });
  if (!pollOption || pollOption.deleted_at !== null) {
    throw new Error("Poll option not found or already deleted");
  }

  // 2. Fetch poll
  const poll = await MyGlobal.prisma.discussion_board_polls.findUnique({
    where: { id: pollOption.discussion_board_poll_id },
  });
  if (!poll) throw new Error("Poll not found");
  if (poll.id !== pollId) throw new Error("Poll/poll option mismatch");

  // 3. Fetch post
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: poll.discussion_board_post_id },
  });
  if (!post) throw new Error("Post not found");
  if (post.id !== postId) throw new Error("Poll/post mismatch");

  // 4. Authorization: only allow poll creator (by post.created_by_id)
  if (post.created_by_id !== user.id) {
    // (Future: check for moderator/admin override)
    throw new Error("Forbidden: Only the poll creator may delete an option");
  }

  // 5. Check poll is not closed (closed_at null means open or is future, i.e. still votable)
  if (poll.closed_at !== null) {
    throw new Error("Cannot delete option from a closed poll");
  }

  // 6. Check post is not locked
  if (post.is_locked) {
    throw new Error("Cannot delete option from a locked post");
  }

  // 7. Soft delete by setting deleted_at
  await MyGlobal.prisma.discussion_board_poll_options.update({
    where: { id: pollOptionId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // Success: nothing is returned (void)
}
