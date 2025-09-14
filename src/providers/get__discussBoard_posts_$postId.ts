import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";

/**
 * Retrieve a single discuss_board_posts entry by postId.
 *
 * This operation retrieves a post from the discuss_board_posts table by its
 * unique postId. The endpoint returns the full post entity, including author
 * reference, title, body, business status, workflow audit timestamps, and a
 * soft-delete marker if present. If the post does not exist or is soft-deleted
 * (deleted_at set), a 404 error is thrown.
 *
 * @param props - The parameter object containing the postId to look up
 * @param props.postId - Unique identifier for the desired post (UUID)
 * @returns The IDiscussBoardPost DTO with all fields suitable for UI or audit
 * @throws {Error} If no active post is found matching the given postId
 */
export async function get__discussBoard_posts_$postId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardPost> {
  const { postId } = props;
  const post = await MyGlobal.prisma.discuss_board_posts.findFirstOrThrow({
    where: {
      id: postId,
      deleted_at: null,
    },
  });
  return {
    id: post.id,
    author_id: post.author_id,
    title: post.title,
    body: post.body,
    business_status: post.business_status,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at:
      post.deleted_at === null || post.deleted_at === undefined
        ? null
        : toISOStringSafe(post.deleted_at),
  };
}
