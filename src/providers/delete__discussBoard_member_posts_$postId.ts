import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Delete (soft-delete) a discussBoard post by ID.
 *
 * This operation marks the post specified by postId as deleted by setting its
 * deleted_at field to the current timestamp (soft delete), along with all
 * associated comments. The member can delete only their own post within a 30
 * minute window from creation; otherwise, deletion requires moderator or
 * administrator privileges (not handled in this endpoint). An audit log of the
 * deletion is inserted.
 *
 * @param props - Operation parameters
 * @param props.member - The authenticated member performing the deletion. This
 *   must match the post author.
 * @param props.postId - The unique identifier of the post to be deleted.
 * @throws {Error} If the post does not exist, is already deleted, if the member
 *   is not active, is not the post owner, or if the deletion window has
 *   expired.
 */
export async function delete__discussBoard_member_posts_$postId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId } = props;

  // Fetch target post (must exist and not be soft-deleted)
  const post = await MyGlobal.prisma.discuss_board_posts.findFirst({
    where: { id: postId, deleted_at: null },
  });
  if (!post) throw new Error("Post not found or already deleted");

  // Fetch member record
  const memberRecord = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: { user_account_id: member.id, deleted_at: null, status: "active" },
  });
  if (!memberRecord) throw new Error("Member not found or inactive");

  // Check post ownership
  if (post.author_id !== memberRecord.id) {
    throw new Error("Unauthorized: Only the post owner can delete this post");
  }

  // Enforce 30 minute deletion window from post creation
  const nowISOString = toISOStringSafe(new Date());
  const nowDate = new Date(nowISOString);
  const createdAtDate = new Date(toISOStringSafe(post.created_at));
  const timeDiffMs = nowDate.getTime() - createdAtDate.getTime();
  if (timeDiffMs > 30 * 60 * 1000) {
    throw new Error(
      "Deletion window expired. Only moderators or administrators can delete this post after 30 minutes.",
    );
  }

  // Transaction: Soft-delete the post, all comments, and write deletion log
  await MyGlobal.prisma.$transaction([
    // Soft-delete the post
    MyGlobal.prisma.discuss_board_posts.update({
      where: { id: postId },
      data: { deleted_at: nowISOString },
    }),
    // Soft-delete all comments attached to the post
    MyGlobal.prisma.discuss_board_comments.updateMany({
      where: { discuss_board_post_id: postId, deleted_at: null },
      data: { deleted_at: nowISOString },
    }),
    // Insert post deletion log for compliance/audit
    MyGlobal.prisma.discuss_board_post_deletion_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        post_id: postId,
        actor_id: memberRecord.id,
        deletion_timestamp: nowISOString,
        deletion_reason: null,
      },
    }),
  ]);
}
