import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieves a paginated, structured list of all replies (nested comments) to a
 * specific comment on a given post within a thread.
 *
 * Returns a paginated, filtered subset of discussion_board_comments rows whose
 * parent_id matches the target comment, post_id matches the parent post, and
 * deleted_at is null (active only). Supports filtering by author/user,
 * nesting_level, and keyword, as well as sorting and pagination.
 *
 * Security: Only authenticated users may access. Only visible
 * (non-soft-deleted) replies are shown.
 *
 * @param props - The props for this operation
 * @param props.user - Authenticated user making the request
 * @param props.threadId - Target thread's unique identifier
 * @param props.postId - Target post's unique identifier
 * @param props.commentId - Target parent comment's unique identifier
 * @param props.body - Filtering, search, and pagination for fetching comment
 *   replies
 * @returns Paginated reply summaries for the provided comment
 */
export async function patch__discussionBoard_user_threads_$threadId_posts_$postId_comments_$commentId_replies(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment> {
  const { user, threadId, postId, commentId, body } = props;

  // Sanitize/normalize pagination
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? Math.min(body.limit, 50) : 20;

  // Build search/filter conditions inline (object spread)
  const where = {
    post_id: postId,
    parent_id: commentId,
    deleted_at: null,
    ...(body.author_id !== undefined &&
      body.author_id !== null && {
        created_by_id: body.author_id,
      }),
    ...(body.nesting_level !== undefined && {
      nesting_level: body.nesting_level,
    }),
    ...(body.search !== undefined &&
      body.search.length > 0 && {
        body: {
          contains: body.search,
          mode: "insensitive" as const,
        },
      }),
  };

  // Sorting
  let orderBy: Record<string, "asc" | "desc">;
  if (body.sort && body.sort.length > 0) {
    // Only support created_at or nesting_level as safe sort fields
    if (body.sort.startsWith("created_at")) {
      const [field, dir] = body.sort.split(" ");
      orderBy = { created_at: dir === "asc" ? "asc" : "desc" };
    } else if (body.sort.startsWith("nesting_level")) {
      const [field, dir] = body.sort.split(" ");
      orderBy = { nesting_level: dir === "asc" ? "asc" : "desc" };
    } else {
      orderBy = { created_at: "desc" };
    }
  } else {
    orderBy = { created_at: "desc" };
  }

  // Query for page results and total record count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comments.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        body: true,
        created_at: true,
        deleted_at: true,
        created_by_id: true,
        nesting_level: true,
        parent_id: true,
      },
    }),
    MyGlobal.prisma.discussion_board_comments.count({ where }),
  ]);

  // Compose response data with proper date/time conversion
  const data = rows.map((row) => ({
    id: row.id,
    body: row.body,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    created_by_id: row.created_by_id,
    nesting_level: row.nesting_level,
    parent_id: row.parent_id ?? null,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
