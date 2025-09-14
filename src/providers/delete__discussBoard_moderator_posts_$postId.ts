import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Delete (soft-delete) a discussBoard post by ID.
 *
 * This endpoint allows a moderator to soft-delete a post and all its associated
 * comments by setting their deleted_at field to the current timestamp (ISO
 * 8601). A post deletion log is created for compliance and auditing. Only
 * authenticated moderators can use this endpoint.
 *
 * @param props - Request properties
 * @param props.moderator - Authenticated moderator user (ModeratorPayload,
 *   id=user_account_id)
 * @param props.postId - The UUID of the post to delete (soft-delete)
 * @throws {Error} If the post does not exist or has already been deleted
 * @throws {Error} If the moderator is not linked to an active member account
 */
export async function delete__discussBoard_moderator_posts_$postId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, postId } = props;

  // 1. Find the post, ensure it exists and is not already deleted
  const post = await MyGlobal.prisma.discuss_board_posts.findUnique({
    where: { id: postId },
    select: { id: true, deleted_at: true },
  });
  if (!post || post.deleted_at !== null)
    throw new Error("Post not found or already deleted");

  // 2. Get moderator's member_id (auth/id flow is: user_account_id -> member.id)
  const moderatorMember = await MyGlobal.prisma.discuss_board_members.findFirst(
    {
      where: {
        user_account_id: moderator.id,
        deleted_at: null,
        status: "active",
      },
      select: { id: true },
    },
  );
  if (!moderatorMember)
    throw new Error("Moderator account not linked to active member");

  // 3. Prepare timestamp for deleted_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 4. Soft-delete the post (set deleted_at)
  await MyGlobal.prisma.discuss_board_posts.update({
    where: { id: postId },
    data: { deleted_at: now },
  });

  // 5. Soft-delete all comments for this post (set deleted_at where active)
  await MyGlobal.prisma.discuss_board_comments.updateMany({
    where: { discuss_board_post_id: postId, deleted_at: null },
    data: { deleted_at: now },
  });

  // 6. Log post deletion event (actor_id: moderator's member.id)
  await MyGlobal.prisma.discuss_board_post_deletion_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      post_id: postId,
      actor_id: moderatorMember.id,
      deletion_timestamp: now,
      deletion_reason: null,
    },
  });
}
