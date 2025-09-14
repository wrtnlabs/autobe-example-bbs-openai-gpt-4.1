import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Soft-delete a comment (discuss_board_comments) with audit logging.
 *
 * This operation performs a soft-delete on the specific comment under a post,
 * updating the deleted_at field and changing the comment business status for
 * compliance and moderation rules. Only the original author can delete within
 * 15 minutes of creation; all other deletion routes are restricted in this
 * endpoint. The deletion is logged in discuss_board_comment_deletion_logs for
 * audit, referencing the acting user's account, the reason, and timestamp. If
 * the comment is already deleted, or you are not the author, or outside the
 * allowed window, an error is thrown.
 *
 * @param props - Properties for deletion
 * @param props.member - The authenticated member performing the deletion
 * @param props.postId - The post UUID the comment belongs to
 * @param props.commentId - The comment UUID to soft-delete
 * @returns Void
 * @throws {Error} If comment not found, not author, out of window, or already
 *   deleted
 */
export async function delete__discussBoard_member_posts_$postId_comments_$commentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId, commentId } = props;
  // Step 1: Fetch comment (by id + post id)
  const comment = await MyGlobal.prisma.discuss_board_comments.findFirst({
    where: {
      id: commentId,
      discuss_board_post_id: postId,
    },
  });
  if (!comment) throw new Error("Comment not found for the specified post");
  // Step 2: Authorization - only author may self-delete
  if (comment.author_member_id !== member.id) {
    throw new Error("You are not authorized to delete this comment");
  }
  // Step 3: Soft-delete window is 15 minutes (strictly enforced)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const fifteenMinutesMs = 15 * 60 * 1000;
  const createdAtMs = new Date(toISOStringSafe(comment.created_at)).getTime();
  const nowMs = new Date(now).getTime();
  if (nowMs - createdAtMs > fifteenMinutesMs) {
    throw new Error(
      "Comments may only be deleted within 15 minutes of creation",
    );
  }
  // Step 4: Already deleted?
  if (comment.deleted_at) {
    throw new Error("Comment already deleted");
  }
  // Step 5: Soft-delete the comment
  await MyGlobal.prisma.discuss_board_comments.update({
    where: { id: commentId },
    data: {
      deleted_at: now,
      status: "deleted",
    },
  });
  // Step 6: Log the deletion
  // Need to find the user_account_id for this member
  const memberEnt = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: { id: member.id },
  });
  if (!memberEnt) throw new Error("Acting member not found");
  await MyGlobal.prisma.discuss_board_comment_deletion_logs.create({
    data: {
      id: v4(),
      discuss_board_comment_id: commentId,
      actor_user_account_id: memberEnt.user_account_id,
      deletion_reason: "self_delete",
      actor_note: undefined,
      deleted_at: now,
    },
  });
  return;
}
