import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Remove a tag association from a discussBoard post by postId and tagId.
 *
 * This operation dissociates the specified tag from the identified post by
 * deleting the corresponding row from the discuss_board_post_tags table. The
 * tag entity itself is unaffected; only the post-tag relation is removed.
 *
 * Authorization: Only moderators (as authenticated via ModeratorAuth) may
 * perform this action.
 *
 * @param props - Arguments for tag unlink. props.moderator is the authorized
 *   moderator, postId and tagId must be provided.
 * @param props.moderator - The authenticated moderator performing the
 *   operation.
 * @param props.postId - The unique identifier of the post to dissociate the tag
 *   from.
 * @param props.tagId - The unique identifier of the tag to remove from the
 *   post.
 * @returns Void
 * @throws {Error} If the association between the post and tag does not exist.
 */
export async function delete__discussBoard_moderator_posts_$postId_tags_$tagId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { postId, tagId } = props;
  // Confirm the association exists before deleting
  const association = await MyGlobal.prisma.discuss_board_post_tags.findFirst({
    where: {
      post_id: postId,
      tag_id: tagId,
    },
    select: { id: true },
  });
  if (!association) {
    throw new Error("Tag association not found");
  }
  await MyGlobal.prisma.discuss_board_post_tags.delete({
    where: {
      post_id_tag_id: {
        post_id: postId,
        tag_id: tagId,
      },
    },
  });
}
