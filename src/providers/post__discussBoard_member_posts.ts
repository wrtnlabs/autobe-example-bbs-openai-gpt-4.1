import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new post in discuss_board_posts as the authenticated user.
 *
 * This function allows authenticated members to contribute new discussion
 * topics to the board. It accepts a title, body, optional business status, and
 * optional tag assignments. The author ID is derived from the authenticated
 * member in props. Tag assignments are handled via additional records in
 * discuss_board_post_tags. All timestamps are handled with proper ISO8601
 * string branding, and UUIDs are generated for all new records. Returns the
 * complete post entity suitable for immediate use in the UI.
 *
 * @param props - Member: The authenticated member performing the action (must
 *   have .id) body: The post creation parameters (title, body, optional
 *   business_status and tag_ids)
 * @returns The full post entity as IDiscussBoardPost
 * @throws Error if creation fails or business logic is violated
 */
export async function post__discussBoard_member_posts(props: {
  member: MemberPayload;
  body: IDiscussBoardPost.ICreate;
}): Promise<IDiscussBoardPost> {
  const { member, body } = props;

  const postId: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const businessStatus: string = body.business_status ?? "public";

  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.discuss_board_posts.create({
      data: {
        id: postId,
        author_id: member.id,
        title: body.title,
        body: body.body,
        business_status: businessStatus,
        created_at: now,
        updated_at: now,
      },
    });
    if (body.tag_ids && body.tag_ids.length > 0) {
      await Promise.all(
        body.tag_ids.map((tagId) =>
          tx.discuss_board_post_tags.create({
            data: {
              id: v4(),
              post_id: postId,
              tag_id: tagId,
              created_at: now,
            },
          }),
        ),
      );
    }
    return created;
  });

  return {
    id: result.id,
    author_id: result.author_id,
    title: result.title,
    body: result.body,
    business_status: result.business_status,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at ? toISOStringSafe(result.deleted_at) : null,
  };
}
