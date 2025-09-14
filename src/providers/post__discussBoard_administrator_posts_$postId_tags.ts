import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPostTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPostTag";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Add a new tag to a discussBoard post by postId and tagId.
 *
 * This endpoint enables administrators to associate a new tag with a specific
 * discussBoard post. It ensures the post exists, no duplicate assignment is
 * made, and the maximum number of tags per post (5) is not exceeded. The
 * administrator's privileges are assumed valid from authentication. All date
 * values are written as string & tags.Format<'date-time'>; no native Date types
 * are used.
 *
 * @param props - Object containing administrator payload, postId, and tag
 *   assignment body
 * @param props.administrator - The authenticated administrator performing the
 *   tag assignment
 * @param props.postId - Unique identifier of the post to tag
 * @param props.body - Object with the tag_id to assign
 * @returns Details of the created tag assignment linking tag and post
 * @throws {Error} If the post does not exist or is deleted, the tag is already
 *   assigned, or the tag limit is reached
 */
export async function post__discussBoard_administrator_posts_$postId_tags(props: {
  administrator: AdministratorPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussBoardPostTag.ICreate;
}): Promise<IDiscussBoardPostTag> {
  const { administrator, postId, body } = props;

  // Step 1: Confirm the post exists and is not deleted.
  const post = await MyGlobal.prisma.discuss_board_posts.findUnique({
    where: { id: postId },
    select: { id: true, deleted_at: true },
  });
  if (!post || post.deleted_at !== null) {
    throw new Error("Post not found or has been deleted.");
  }

  // Step 2: Ensure the (post_id, tag_id) combination does not already exist.
  const exists = await MyGlobal.prisma.discuss_board_post_tags.findFirst({
    where: { post_id: postId, tag_id: body.tag_id },
    select: { id: true },
  });
  if (exists) {
    throw new Error("This tag is already assigned to the post.");
  }

  // Step 3: Check that assigning this tag will not exceed the business max tag limit (5).
  const tagCount = await MyGlobal.prisma.discuss_board_post_tags.count({
    where: { post_id: postId },
  });
  if (tagCount >= 5) {
    throw new Error("Cannot assign more than 5 tags to a single post.");
  }

  // Step 4: Create the tag assignment. Use only string & tags.Format<'uuid'> for IDs and string & tags.Format<'date-time'> for dates.
  const created = await MyGlobal.prisma.discuss_board_post_tags.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      post_id: postId,
      tag_id: body.tag_id,
      created_at: toISOStringSafe(new Date()), // CORRECT: always use toISOStringSafe to convert Date
    },
    select: { id: true, post_id: true, tag_id: true, created_at: true },
  });

  return {
    id: created.id,
    post_id: created.post_id,
    tag_id: created.tag_id,
    created_at: toISOStringSafe(created.created_at), // convert for brand safety — even if it's already an ISO string
  };
}
