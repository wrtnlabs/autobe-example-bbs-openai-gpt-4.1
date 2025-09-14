import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Delete (soft-delete) a discussBoard post by ID (administrator privilege).
 *
 * This operation allows an administrator to perform a soft delete on any post
 * by its unique ID. The post's deleted_at field is set to the current
 * timestamp, effectively removing it from normal queries while preserving data
 * for audit/compliance purposes. All comments associated with the post are also
 * soft-deleted as required by business policy. Each delete action is recorded
 * as an audit entry in the discuss_board_post_deletion_logs table.
 *
 * @param props - Object containing administrator authentication and the target
 *   postId
 * @param props.administrator - The authenticated administrator payload (must
 *   have active privileges)
 * @param props.postId - The UUID of the post to be soft-deleted
 * @returns Void
 * @throws {Error} When the post does not exist or has already been deleted
 */
export async function delete__discussBoard_administrator_posts_$postId(props: {
  administrator: AdministratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, postId } = props;
  // Step 1: Fetch the post (must not already be soft-deleted)
  const post = await MyGlobal.prisma.discuss_board_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new Error("Post not found or already deleted");
  }
  // Step 2: Prepare deletion timestamp ONCE for consistency
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  // Step 3: Soft delete the post
  await MyGlobal.prisma.discuss_board_posts.update({
    where: { id: postId },
    data: { deleted_at: deletedAt },
  });
  // Step 4: Soft delete all comments belonging to this post (not already deleted)
  await MyGlobal.prisma.discuss_board_comments.updateMany({
    where: {
      discuss_board_post_id: postId,
      deleted_at: null,
    },
    data: { deleted_at: deletedAt },
  });
  // Step 5: Create audit log for this deletion event
  await MyGlobal.prisma.discuss_board_post_deletion_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      post_id: postId,
      actor_id: administrator.id,
      deletion_timestamp: deletedAt,
      deletion_reason: null,
    },
  });
}
