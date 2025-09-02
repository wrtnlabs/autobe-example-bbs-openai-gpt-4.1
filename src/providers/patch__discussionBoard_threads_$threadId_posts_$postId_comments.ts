import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Search and retrieve a paginated, filterable list of comments for a post.
 *
 * Obtain a filtered, paginated list of comments for a specific post within a
 * thread. This operation enables recursive comment structures up to five levels
 * deep. Supports advanced search by author, keyword, nesting level, date range,
 * and ordering. Excludes soft-deleted comments (those with deleted_at set).
 * Pagination and sorting parameters allow efficient display for posts with high
 * comment volume. Returns summary/comment list data optimized for threaded
 * views.
 *
 * @param props - Request properties
 * @param props.threadId - Unique identifier for the parent thread
 * @param props.postId - Unique identifier for the specific post within the
 *   thread
 * @param props.body - Filter and pagination criteria for retrieving comments.
 *   Includes parent/reply context, author filtering, search keyword, nesting
 *   level, and sort/page/limit params.
 * @returns Paginated result set of comment summaries matching the query/filter
 *   criteria.
 * @throws {Error} When postId in path and body do not match
 */
export async function patch__discussionBoard_threads_$threadId_posts_$postId_comments(props: {
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const { threadId, postId, body } = props;
  // Validate path/body coherence
  if (postId !== body.post_id)
    throw new Error("postId in path and body must match");

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  // Defensive type normalization for IPage.IPagination
  const current = Number(page);
  const pageLimit = Number(limit);

  const where = {
    post_id: postId,
    deleted_at: null,
    ...(body.parent_id !== undefined &&
      body.parent_id !== null && {
        parent_id: body.parent_id,
      }),
    ...(body.nesting_level !== undefined &&
      body.nesting_level !== null && {
        nesting_level: body.nesting_level,
      }),
    ...(body.author_id !== undefined &&
      body.author_id !== null && {
        created_by_id: body.author_id,
      }),
    ...(body.search && {
      body: { contains: body.search, mode: "insensitive" as const },
    }),
  };

  // Only allow sortable fields that are safe here
  const sortableFields = ["created_at", "nesting_level"];
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort) {
    const [field, dir] = body.sort.trim().split(/\s+/);
    if (sortableFields.includes(field)) {
      orderBy = { [field]: dir === "asc" ? "asc" : "desc" };
    }
  }
  const skip = (current - 1) * pageLimit;
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where,
      orderBy,
      skip,
      take: pageLimit,
    }),
    MyGlobal.prisma.discussion_board_comments.count({ where }),
  ]);

  return {
    pagination: {
      current,
      limit: pageLimit,
      records: total,
      pages: Math.ceil(total / pageLimit),
    },
    data: rows.map((row) => ({
      id: row.id,
      body: row.body,
      created_at: toISOStringSafe(row.created_at),
      deleted_at:
        row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
      created_by_id: row.created_by_id,
      nesting_level: row.nesting_level,
      parent_id: row.parent_id ?? null,
    })),
  };
}
