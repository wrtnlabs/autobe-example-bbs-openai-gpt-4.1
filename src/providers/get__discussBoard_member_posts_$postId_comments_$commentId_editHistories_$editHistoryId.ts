import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardCommentEditHistory";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieve detailed information for a single comment edit history record.
 *
 * This function fetches a comprehensive record of an edit event applied to a
 * discussion board comment. The operation strictly enforces that only the
 * author of the comment may view this audit entry. It performs all hierarchical
 * linkage checks between post, comment, and edit history. All fields are mapped
 * precisely and temporal fields are converted to ISO8601 format. Used by
 * moderation UI, user history access, and compliance review.
 *
 * @param props - Object containing the required identifiers and authenticated
 *   member
 * @param props.member - The authenticated member (JWT payload)
 * @param props.postId - UUID of the parent post
 * @param props.commentId - UUID of the comment whose edit history is requested
 * @param props.editHistoryId - UUID of the specific edit event to retrieve
 * @returns Full IDiscussBoardCommentEditHistory with all audit and contextual
 *   fields
 * @throws {Error} If any of: edit history does not exist, mismatch to comment,
 *   comment does not exist, comment not under post, or the member is not the
 *   author
 */
export async function get__discussBoard_member_posts_$postId_comments_$commentId_editHistories_$editHistoryId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardCommentEditHistory> {
  const { member, postId, commentId, editHistoryId } = props;

  // 1. Load the edit history and ensure it exists
  const history =
    await MyGlobal.prisma.discuss_board_comment_edit_histories.findUnique({
      where: { id: editHistoryId },
    });
  if (!history) throw new Error("Edit history record does not exist");

  // 2. Ensure edit history belongs to the specified comment
  if (history.discuss_board_comment_id !== commentId)
    throw new Error("Edit history does not belong to specified comment");

  // 3. Load the comment and ensure it exists
  const comment = await MyGlobal.prisma.discuss_board_comments.findUnique({
    where: { id: commentId },
  });
  if (!comment) throw new Error("Comment does not exist");

  // 4. Ensure comment belongs to the specified post
  if (comment.discuss_board_post_id !== postId)
    throw new Error("Comment does not belong to specified post");

  // 5. Enforce author-only access: member must be the comment's author
  if (comment.author_member_id !== member.id)
    throw new Error(
      "Access denied: Only the comment author may view this edit history",
    );

  // 6. Map to return DTO (no Date type anywhere!)
  return {
    id: history.id,
    discuss_board_comment_id: history.discuss_board_comment_id,
    editor_member_id: history.editor_member_id,
    previous_content: history.previous_content,
    previous_status: history.previous_status,
    editor_note: history.editor_note ?? null,
    created_at: toISOStringSafe(history.created_at),
  };
}
