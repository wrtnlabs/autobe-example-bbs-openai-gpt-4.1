import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update content of an existing comment (discuss_board_comments).
 *
 * Updates an existing comment for a given post. Only the comment's author
 * (member) may edit within the allowed edit window (15 minutes) and when the
 * comment is not locked. The function performs length and forbidden words
 * validation, writes an edit history entry for compliance, and returns the
 * updated comment record.
 *
 * @param props - Properties for the update operation
 * @param props.member - The authenticated member performing the update
 * @param props.postId - UUID of the parent post containing the comment
 * @param props.commentId - UUID of the comment to update
 * @param props.body - IDiscussBoardComment.IUpdate containing new content for
 *   the comment
 * @returns The updated IDiscussBoardComment object, with all fields up to date
 * @throws {Error} If the comment is not found, caller is not the author, the
 *   comment is locked, the edit window has expired, or content is invalid
 */
export async function put__discussBoard_member_posts_$postId_comments_$commentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussBoardComment.IUpdate;
}): Promise<IDiscussBoardComment> {
  const { member, postId, commentId, body } = props;
  // 1. Retrieve the comment and ensure all business constraints
  const comment = await MyGlobal.prisma.discuss_board_comments.findFirst({
    where: {
      id: commentId,
      discuss_board_post_id: postId,
      deleted_at: null,
    },
  });
  if (!comment) throw new Error("Comment not found for update");

  if (comment.author_member_id !== member.id)
    throw new Error("You may only edit your own comments");
  if (comment.is_locked)
    throw new Error("This comment is locked and cannot be edited");

  // Duration check (edit window enforcement)
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const createdAtTime =
    typeof comment.created_at === "string"
      ? Date.parse(comment.created_at)
      : comment.created_at.getTime();
  const nowTime = Date.parse(nowIso);
  const fifteenMinutes = 15 * 60 * 1000;
  if (nowTime - createdAtTime > fifteenMinutes)
    throw new Error("Edit window has expired");

  // Content validation
  const content = body.content ?? "";
  const minLen = 2,
    maxLen = 2000;
  if (content.length < minLen || content.length > maxLen)
    throw new Error("Content length must be between 2 and 2000 characters");
  // Forbidden word filter
  const forbidden: { expression: string }[] =
    await MyGlobal.prisma.discuss_board_forbidden_words.findMany({
      where: { deleted_at: null },
    });
  for (const f of forbidden)
    if (content.toLowerCase().includes(f.expression.toLowerCase()))
      throw new Error(
        `Content contains forbidden word or phrase: "${f.expression}"`,
      );

  // 2. Log previous version in edit history (compliance)
  await MyGlobal.prisma.discuss_board_comment_edit_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discuss_board_comment_id: commentId,
      editor_member_id: member.id,
      previous_content: comment.content,
      previous_status: comment.status,
      editor_note: undefined,
      created_at: nowIso,
    },
  });

  // 3. Update comment
  const updated = await MyGlobal.prisma.discuss_board_comments.update({
    where: { id: commentId },
    data: {
      content,
      updated_at: nowIso,
    },
  });

  // 4. Return updated record, stringifying dates
  return {
    id: updated.id,
    discuss_board_post_id: updated.discuss_board_post_id,
    parent_id: updated.parent_id ?? undefined,
    author_member_id: updated.author_member_id,
    content: updated.content,
    depth: updated.depth,
    is_locked: updated.is_locked,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
