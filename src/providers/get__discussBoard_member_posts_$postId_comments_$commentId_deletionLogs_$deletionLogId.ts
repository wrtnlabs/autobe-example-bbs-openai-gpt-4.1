import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardCommentDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardCommentDeletionLog";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Get details of a specific comment deletion log
 * (discuss_board_comment_deletion_logs).
 *
 * This operation retrieves the details of a specific deletion log for a comment
 * within a post. It provides insight into who deleted the comment, when the
 * deletion took place, and the rationale behind it. The endpoint is essential
 * for transparency, audit, and compliance workflows on the discussBoard
 * platform.
 *
 * Security: Only the comment author or the actor who performed the deletion may
 * access this log. Unauthorized access is denied.
 *
 * @param props - Properties object
 * @param props.member - The authenticated member requesting the log detail
 * @param props.postId - UUID of the post containing the comment
 * @param props.commentId - UUID of the comment for which the deletion log is
 *   queried
 * @param props.deletionLogId - UUID of the specific deletion log record
 * @returns The specified deletion log entry for the comment, including actor,
 *   reason, optional note, and timestamp
 * @throws {Error} If the log does not exist, the comment/post doesn't match, or
 *   the member lacks access rights
 */
export async function get__discussBoard_member_posts_$postId_comments_$commentId_deletionLogs_$deletionLogId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  deletionLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardCommentDeletionLog> {
  const { member, postId, commentId, deletionLogId } = props;

  // Look up the deletion log by primary key
  const log =
    await MyGlobal.prisma.discuss_board_comment_deletion_logs.findUnique({
      where: { id: deletionLogId },
      select: {
        id: true,
        discuss_board_comment_id: true,
        actor_user_account_id: true,
        deletion_reason: true,
        actor_note: true,
        deleted_at: true,
      },
    });
  if (!log) throw new Error("Deletion log not found");
  if (log.discuss_board_comment_id !== commentId)
    throw new Error("Comment does not match deletion log");

  // Look up the comment
  const comment = await MyGlobal.prisma.discuss_board_comments.findUnique({
    where: { id: commentId },
    select: {
      discuss_board_post_id: true,
      author_member_id: true,
    },
  });
  if (!comment) throw new Error("Comment not found");
  if (comment.discuss_board_post_id !== postId)
    throw new Error("Post does not match comment");

  // Look up the author member's user account
  const authorMember = await MyGlobal.prisma.discuss_board_members.findUnique({
    where: { id: comment.author_member_id },
    select: { user_account_id: true },
  });
  if (!authorMember) throw new Error("Comment author not found");

  // Authorization: Member can access if they are the comment author or deletion actor
  const isOwner = authorMember.user_account_id === member.id;
  const isActor = log.actor_user_account_id === member.id;
  if (!isOwner && !isActor)
    throw new Error("Unauthorized to view deletion log");

  return {
    id: log.id,
    discuss_board_comment_id: log.discuss_board_comment_id,
    actor_user_account_id: log.actor_user_account_id,
    deletion_reason: log.deletion_reason,
    actor_note: log.actor_note ?? undefined,
    deleted_at: toISOStringSafe(log.deleted_at),
  };
}
