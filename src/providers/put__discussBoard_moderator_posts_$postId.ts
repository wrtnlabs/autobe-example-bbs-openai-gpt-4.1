import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update an existing discussBoard post by ID.
 *
 * This endpoint allows a moderator to update any post's title, body, or
 * business status. Moderators are not subject to edit windows—they may update
 * posts regardless of author or creation time. Editable fields are: title,
 * body, business_status. Tag assignments must be managed by a different
 * endpoint. All validations, forbidden word filtering, and policy checks are
 * enforced outside this handler.
 *
 * @param props - Object containing the moderator payload, postId (UUID), and
 *   body with updates
 * @param props.moderator - The authenticated moderator performing the update
 * @param props.postId - The unique identifier of the post to update
 * @param props.body - Optional updates: title, body, business_status (all
 *   fields optional, only those given are updated)
 * @returns The updated discussBoard post with all required fields
 * @throws {Error} If the post does not exist
 */
export async function put__discussBoard_moderator_posts_$postId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussBoardPost.IUpdate;
}): Promise<IDiscussBoardPost> {
  const { postId, body } = props;
  const post = await MyGlobal.prisma.discuss_board_posts.findUnique({
    where: { id: postId },
  });
  if (!post) throw new Error("Post not found");
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discuss_board_posts.update({
    where: { id: postId },
    data: {
      title: body.title ?? undefined,
      body: body.body ?? undefined,
      business_status: body.business_status ?? undefined,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    author_id: updated.author_id,
    title: updated.title,
    body: updated.body,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
