import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPostTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPostTag";

/**
 * Get a specific tag assignment detail for a given discussBoard post.
 *
 * Retrieves details of a specific tag assigned to a post from the
 * discuss_board_post_tags table. Returns metadata about the tag assignment,
 * including the tag's unique identifier, the association (post-tag), and the
 * assignment timestamp. This operation is accessible to all (including guests),
 * does not require authentication, and throws if the tag assignment does not
 * exist for the provided post and tag IDs.
 *
 * @param props - Parameters required to query the tag assignment
 * @param props.postId - The unique identifier of the post whose tag is being
 *   retrieved
 * @param props.tagId - The unique identifier of the tag on the given post
 * @returns The detail of the tag assignment between the specified post and tag
 * @throws {Error} If the specified tag is not assigned to the provided post
 *   (not found)
 */
export async function get__discussBoard_posts_$postId_tags_$tagId(props: {
  postId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardPostTag> {
  const { postId, tagId } = props;
  const tagAssignment =
    await MyGlobal.prisma.discuss_board_post_tags.findFirstOrThrow({
      where: { post_id: postId, tag_id: tagId },
    });
  return {
    id: tagAssignment.id,
    post_id: tagAssignment.post_id,
    tag_id: tagAssignment.tag_id,
    created_at: toISOStringSafe(tagAssignment.created_at),
  };
}
