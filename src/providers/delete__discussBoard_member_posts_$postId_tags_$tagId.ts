import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Remove a tag association from a discussBoard post by postId and tagId.
 *
 * This operation dissociates a tag from a post by deleting the corresponding
 * row in the discuss_board_post_tags table. Only the post owner (author) may
 * perform this action via this endpoint. Moderators/admins require higher auth
 * context. Deletion is by unique combination of postId and tagId. If the
 * association does not exist, an error is thrown. No effect on the tag entity
 * itself.
 *
 * @param props - Properties for tag dissociation
 * @param props.member - Authenticated member user (role: "member")
 * @param props.postId - The post's unique identifier
 * @param props.tagId - The tag's unique identifier to be removed from this post
 * @returns Void
 * @throws {Error} When the post does not exist, the user is not the post owner,
 *   or the tag-post association was not found.
 */
export async function delete__discussBoard_member_posts_$postId_tags_$tagId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId, tagId } = props;

  // 1. Find the post and verify author/ownership. Only author can remove tags through this endpoint.
  const post = await MyGlobal.prisma.discuss_board_posts.findUnique({
    where: { id: postId },
    select: { id: true, author_id: true },
  });
  if (!post) {
    throw new Error("Post not found");
  }
  if (post.author_id !== member.id) {
    throw new Error("Unauthorized: Only the post owner can remove tags");
  }
  // 2. Find association to ensure it exists
  const association = await MyGlobal.prisma.discuss_board_post_tags.findUnique({
    where: { post_id_tag_id: { post_id: postId, tag_id: tagId } },
    select: { id: true },
  });
  if (!association) {
    throw new Error("Tag association not found");
  }
  // 3. Delete association row
  await MyGlobal.prisma.discuss_board_post_tags.delete({
    where: { id: association.id },
  });
}
