import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardComment";

/**
 * Retrieve detailed information for a specific comment
 * (discuss_board_comments).
 *
 * This operation fetches the full details of a single comment under a specified
 * post by combining both postId and commentId as the primary lookup criteria.
 * Returns content, author, status, depth, lock and delete flags, and all
 * metadata for use in comment detail displays or confirmation flows. Date
 * fields are correctly serialized per project conventions. Only active records
 * are returned; an error is thrown if the comment does not exist.
 *
 * @param props - Parameters for the comment detail retrieval
 * @param props.postId - The UUID of the post containing the comment
 * @param props.commentId - The UUID of the comment to retrieve
 * @returns Full information about the requested comment, including author,
 *   content, status, and metadata
 * @throws {Error} If the specified comment is not found or does not belong to
 *   the given post
 */
export async function get__discussBoard_posts_$postId_comments_$commentId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardComment> {
  const { postId, commentId } = props;
  // Find comment by composite criteria
  const comment = await MyGlobal.prisma.discuss_board_comments.findFirst({
    where: {
      id: commentId,
      discuss_board_post_id: postId,
    },
  });
  if (!comment) {
    throw new Error("Comment not found");
  }
  return {
    id: comment.id,
    discuss_board_post_id: comment.discuss_board_post_id,
    parent_id: comment.parent_id ?? undefined,
    author_member_id: comment.author_member_id,
    content: comment.content,
    depth: comment.depth,
    is_locked: comment.is_locked,
    status: comment.status,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
