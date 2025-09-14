import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";
import { IPageIDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardPost";

/**
 * Search, filter, and paginate discuss_board_posts for browsing and discovery.
 *
 * This operation retrieves a paginated, searchable list of posts in the
 * discuss_board_posts table. It provides advanced filtering, full-text search,
 * sorting, and pagination support, following best practices for forum
 * discussion browsing.
 *
 * Supported filters include authorId, status (e.g., public, limited, locked),
 * tagId, keyword search in title and body, creation/update date ranges, and
 * sorting by recency or popularity. The operation returns a paginated result
 * set of post summaries suitable for feed and search UI.
 *
 * Access control is open: all roles can browse public posts, while
 * limited/locked/private content appears only for users with sufficient
 * permissions (filtered by business logic). No authentication required for this
 * endpoint.
 *
 * @param props - Object containing the request body with
 *   filtering/sorting/pagination criteria
 * @param props.body - IDiscussBoardPost.IRequest: request criteria for
 *   searching/filtering/paginating posts
 * @returns Paginated result set of post summaries with pagination metadata
 */
export async function patch__discussBoard_posts(props: {
  body: IDiscussBoardPost.IRequest;
}): Promise<IPageIDiscussBoardPost.ISummary> {
  const body = props.body;
  // Pagination defaults, page starts at 1
  const page =
    typeof body.page === "number" && body.page > 0 ? Number(body.page) : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 && body.limit <= 100
      ? Number(body.limit)
      : 20;

  // Tag filter logic:
  let postIdFilter: string[] | undefined;
  if (body.tag_id) {
    const postTagRows = await MyGlobal.prisma.discuss_board_post_tags.findMany({
      where: { tag_id: body.tag_id },
      select: { post_id: true },
    });
    postIdFilter = postTagRows.map((row) => row.post_id);
    if (postIdFilter.length === 0) {
      return {
        pagination: {
          current: Number(page),
          limit: Number(limit),
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
  }
  // Build main Prisma filter
  const where = {
    deleted_at: null,
    ...(body.author_id !== undefined && { author_id: body.author_id }),
    ...(body.status !== undefined && { business_status: body.status }),
    ...(postIdFilter && { id: { in: postIdFilter } }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
    ...(body.keyword && body.keyword.trim().length > 0
      ? {
          OR: [
            { title: { contains: body.keyword.trim() } },
            { body: { contains: body.keyword.trim() } },
          ],
        }
      : {}),
  };
  // Allowed fields to sort by
  const allowedSortFields = ["created_at", "updated_at", "title"];
  const sortBy = allowedSortFields.includes(body.sort_by || "")
    ? (body.sort_by as "created_at" | "updated_at" | "title")
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Query posts and total count in parallel
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_posts.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        business_status: true,
        author_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.discuss_board_posts.count({ where }),
  ]);

  const data = posts.map((post) => ({
    id: post.id,
    title: post.title,
    business_status: post.business_status,
    author_id: post.author_id,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at:
      post.deleted_at !== null && post.deleted_at !== undefined
        ? toISOStringSafe(post.deleted_at)
        : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
    data,
  };
}
