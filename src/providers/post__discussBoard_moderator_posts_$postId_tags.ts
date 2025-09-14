import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPostTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPostTag";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Add a new tag to a discussBoard post by postId and tagId.
 *
 * This endpoint enables authenticated moderators to assign a new tag to a post
 * specified by postId. It performs business validation to ensure: (1) the post
 * exists and is not deleted, (2) this tag has not already been assigned to this
 * post, and (3) the maximum number of tags (5) per post is not exceeded. Upon
 * success, the tag assignment is recorded in the discuss_board_post_tags table
 * and the newly created association is returned. Only authorized moderators may
 * perform this action.
 *
 * @param props - Request props
 * @param props.moderator - The authenticated moderator making the request
 * @param props.postId - The UUID of the post for which the tag is being
 *   assigned
 * @param props.body - Contains the tag_id to assign (must reference a valid
 *   tag)
 * @returns The new tag assignment as an IDiscussBoardPostTag object
 * @throws {Error} If the post does not exist, is deleted, if the tag is already
 *   assigned, or if the tag limit is exceeded
 */
export async function post__discussBoard_moderator_posts_$postId_tags(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussBoardPostTag.ICreate;
}): Promise<IDiscussBoardPostTag> {
  const { moderator, postId, body } = props;
  // (1) Confirm post exists and is not deleted
  const post = await MyGlobal.prisma.discuss_board_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true, author_id: true },
  });
  if (!post) {
    throw new Error("Post not found or has been deleted");
  }
  // (2) Prevent duplicate tag assignment
  const duplicateTag = await MyGlobal.prisma.discuss_board_post_tags.findFirst({
    where: { post_id: postId, tag_id: body.tag_id },
  });
  if (duplicateTag) {
    throw new Error("This tag is already assigned to the post");
  }
  // (3) Maximum 5 tags per post
  const tagCount = await MyGlobal.prisma.discuss_board_post_tags.count({
    where: { post_id: postId },
  });
  if (tagCount >= 5) {
    throw new Error("Maximum number of tags per post is 5");
  }
  // (4) Create new tag assignment atomically
  const created = await MyGlobal.prisma.discuss_board_post_tags.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      post_id: postId,
      tag_id: body.tag_id,
      created_at: toISOStringSafe(new Date()),
    },
  });
  // (5) Return as DTO (no Date type or as assertions)
  return {
    id: created.id,
    post_id: created.post_id,
    tag_id: created.tag_id,
    created_at: toISOStringSafe(created.created_at),
  };
}
