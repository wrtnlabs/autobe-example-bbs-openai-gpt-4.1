import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Remove a tag association from a discussBoard post by postId and tagId.
 *
 * This operation allows an administrator to dissociate a specific tag from a
 * post. It deletes the row from the `discuss_board_post_tags` table
 * corresponding to the (postId, tagId) pair. If the association does not exist,
 * an error is thrown. Authorization is enforced via the AdministratorPayload
 * and only administrators can invoke this function. No effect on the tag entity
 * or the post itself occurs—only the link is deleted. No Date type is used, and
 * all IDs are strictly branded UUIDs.
 *
 * @param props - Object containing: administrator (AdministratorPayload),
 *   postId (UUID of post), tagId (UUID of tag)
 * @returns Void
 * @throws {Error} If the tag-post association does not exist
 */
export async function delete__discussBoard_administrator_posts_$postId_tags_$tagId(props: {
  administrator: AdministratorPayload;
  postId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { postId, tagId } = props;

  // Find association (must exist to delete)
  const tagLink = await MyGlobal.prisma.discuss_board_post_tags.findFirst({
    where: { post_id: postId, tag_id: tagId },
    select: { id: true },
  });
  if (!tagLink) {
    throw new Error("Tag association not found for the given post.");
  }

  await MyGlobal.prisma.discuss_board_post_tags.delete({
    where: { id: tagLink.id },
  });
}
