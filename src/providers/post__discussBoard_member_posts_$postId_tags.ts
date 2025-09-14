import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPostTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPostTag";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Add a new tag to a discussBoard post by postId and tagId.
 *
 * This endpoint enables an authenticated member to assign a tag to their own
 * post (specified by postId). It performs all business logic enforcement: only
 * the post owner can assign tags, prevents duplicate tag assignments, ensures
 * there are not more than 5 tags per post, and performs all data safety and
 * type requirements inline.
 *
 * Authorization: Only post owners (matching member) can perform this operation.
 *
 * @param props - Parameter object
 * @param props.member - The authenticated MemberPayload performing the
 *   operation
 * @param props.postId - The target post's UUID
 * @param props.body - Payload with the tag_id to assign (ICreate)
 * @returns Details of the newly created tag association for the post
 * @throws {Error} If authorization, tag limit, or uniqueness constraints are
 *   violated
 */
export async function post__discussBoard_member_posts_$postId_tags(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussBoardPostTag.ICreate;
}): Promise<IDiscussBoardPostTag> {
  const { member, postId, body } = props;
  // Step 1: Check the post exists and is not deleted
  const post = await MyGlobal.prisma.discuss_board_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { author_id: true },
  });
  if (!post) throw new Error("Post not found or already deleted");

  // Step 2: Map member payload to member row (by user_account_id)
  const memberRow = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: { user_account_id: member.id, deleted_at: null },
    select: { id: true },
  });
  if (!memberRow) throw new Error("Member not found or not active");
  if (post.author_id !== memberRow.id) {
    throw new Error(
      "Unauthorized: Only the post owner may assign tags to this post",
    );
  }

  // Step 3: Enforce max 5 tags per post
  const tagCount = await MyGlobal.prisma.discuss_board_post_tags.count({
    where: { post_id: postId },
  });
  if (tagCount >= 5)
    throw new Error("Cannot assign more than 5 tags to a post");

  // Step 4: Check that this tag is not already assigned to the post
  const duplicate = await MyGlobal.prisma.discuss_board_post_tags.findFirst({
    where: { post_id: postId, tag_id: body.tag_id },
  });
  if (duplicate) throw new Error("This tag is already assigned to the post");

  // Step 5: (Optional) Tag existence validation cannot be enforced here — requires tag table not present in schema
  // If tag validation is to be implemented in future, add check here.

  // Step 6: Insert tag assignment
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discuss_board_post_tags.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      post_id: postId,
      tag_id: body.tag_id,
      created_at: now,
    },
  });

  return {
    id: created.id,
    post_id: created.post_id,
    tag_id: created.tag_id,
    created_at: toISOStringSafe(created.created_at),
  };
}
