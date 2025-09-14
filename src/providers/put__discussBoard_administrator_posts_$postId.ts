import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update an existing discussBoard post by ID (Administrator).
 *
 * This operation allows an authenticated administrator to update editable
 * fields of any post, including title, body, and business_status. Business
 * rules/enforcements such as validation, forbidden word filtering, and audit
 * trails are presumed to be handled at higher service layers; this provider
 * updates only allowed fields.
 *
 * @param props - The request parameter object
 * @param props.administrator - Authenticated administrator payload (role
 *   enforced by decorator)
 * @param props.postId - The unique identifier of the post to update (UUID)
 * @param props.body - Fields to update (title, body, business_status)
 * @returns The updated discussBoard post as per IDiscussBoardPost structure
 * @throws {Error} If the post does not exist
 */
export async function put__discussBoard_administrator_posts_$postId(props: {
  administrator: AdministratorPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussBoardPost.IUpdate;
}): Promise<IDiscussBoardPost> {
  const { postId, body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const post = await MyGlobal.prisma.discuss_board_posts.findUnique({
    where: { id: postId },
  });
  if (!post) throw new Error("Post not found");

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
