import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardComment";
import { IPageIDiscussBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardComment";

/**
 * Search and paginate comments for a given post (discuss_board_comments).
 *
 * Retrieves a paginated, filtered, and optionally sorted list of comments on a
 * specific post, supporting filters by author, parent, content, status,
 * business workflow, and time window, as well as soft-deletion and locking.
 * Respects all field types and nullability rules per schema.
 *
 * @param props - Parameters containing the post UUID and filtering/search
 *   criteria
 * @param props.postId - Unique identifier for the post whose comments are
 *   paginated (UUID)
 * @param props.body - Filtering/pagination/search options (optional fields
 *   supported)
 * @returns IPageIDiscussBoardComment - A paginated list of comments with full
 *   metadata
 * @throws {Error} If the requested post does not exist
 */
export async function patch__discussBoard_posts_$postId_comments(props: {
  postId: string & tags.Format<"uuid">;
  body: IDiscussBoardComment.IRequest;
}): Promise<IPageIDiscussBoardComment> {
  const { postId, body } = props;

  // (1) Check that the post exists (throws if not found)
  await MyGlobal.prisma.discuss_board_posts.findUniqueOrThrow({
    where: { id: postId },
    select: { id: true },
  });

  // (2) Handle pagination/defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // (3) Build filter object for Prisma
  const where = {
    discuss_board_post_id: postId,
    ...(body.author_member_id !== undefined &&
      body.author_member_id !== null && {
        author_member_id: body.author_member_id,
      }),
    ...(body.parent_id !== undefined &&
      body.parent_id !== null && {
        parent_id: body.parent_id,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.depth !== undefined &&
      body.depth !== null && {
        depth: body.depth,
      }),
    ...(body.is_locked !== undefined &&
      body.is_locked !== null && {
        is_locked: body.is_locked,
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
    ...(body.content_q !== undefined &&
      body.content_q !== null &&
      body.content_q.trim().length > 0 && {
        content: { contains: body.content_q },
      }),
    ...(body.deleted === true
      ? { deleted_at: { not: null } }
      : body.deleted === false
        ? { deleted_at: null }
        : {}),
  };

  // (4) Parallel query for data + total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_comments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        discuss_board_post_id: true,
        parent_id: true,
        author_member_id: true,
        content: true,
        depth: true,
        is_locked: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.discuss_board_comments.count({ where }),
  ]);

  // (5) Map each result, converting all dates and handling nulls for deleted_at/parent_id
  const data: IDiscussBoardComment[] = rows.map((row) => ({
    id: row.id,
    discuss_board_post_id: row.discuss_board_post_id,
    parent_id: row.parent_id ?? undefined,
    author_member_id: row.author_member_id,
    content: row.content,
    depth: row.depth,
    is_locked: row.is_locked,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  // (6) Build pagination output, stripping brands as needed
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit || 1)),
    },
    data,
  };
}
