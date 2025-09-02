import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * List and paginate posts for a thread (discussion_board_posts).
 *
 * Retrieves a paginated and filtered list of discussion board posts for a given
 * thread. Supports searching by title/body, author, date range, is_locked, and
 * sort order. Returns summaries of posts excluding soft-deleted ones.
 *
 * @param props - Thread listing props
 * @param props.threadId Identifier of the parent discussion thread (UUID)
 * @param props.body Search, filter, and pagination request
 * @returns Paginated summary result (IPageIDiscussionBoardPost.ISummary)
 * @throws {Error} When thread does not exist or is soft-deleted
 */
export async function patch__discussionBoard_threads_$threadId_posts(props: {
  threadId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPost.IRequest;
}): Promise<IPageIDiscussionBoardPost.ISummary> {
  const { threadId, body } = props;

  // 1. Validate thread exists and is not soft-deleted
  const thread = await MyGlobal.prisma.discussion_board_threads.findFirst({
    where: {
      id: threadId,
      deleted_at: null,
    },
  });
  if (!thread) throw new Error("Thread not found");

  // 2. Compose where filter for posts
  const where = {
    thread_id: threadId,
    deleted_at: null,
    ...(body.created_by_id !== undefined &&
      body.created_by_id !== null && { created_by_id: body.created_by_id }),
    ...(body.is_locked !== undefined &&
      body.is_locked !== null && { is_locked: body.is_locked }),
    ...(body.created_from || body.created_to
      ? {
          created_at: {
            ...(body.created_from && { gte: body.created_from }),
            ...(body.created_to && { lte: body.created_to }),
          },
        }
      : {}),
    ...(body.search && body.search.length > 0
      ? {
          OR: [
            { title: { contains: body.search, mode: "insensitive" as const } },
            { body: { contains: body.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // 3. Pagination: Default page 1, limit 20
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 4. Sorting orderBy: Allow only specific fields for safety
  let orderByClause: {
    created_at?: "asc" | "desc";
    updated_at?: "asc" | "desc";
    title?: "asc" | "desc";
  } = { created_at: "desc" };
  if (
    body.orderBy &&
    ["created_at", "updated_at", "title"].includes(body.orderBy)
  ) {
    const direction =
      body.orderDirection === "asc" ? ("asc" as const) : ("desc" as const);
    if (body.orderBy === "created_at")
      orderByClause = { created_at: direction };
    else if (body.orderBy === "updated_at")
      orderByClause = { updated_at: direction };
    else if (body.orderBy === "title") orderByClause = { title: direction };
  }

  // 5. Query posts (findMany) and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_posts.findMany({
      where,
      orderBy: orderByClause,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_posts.count({
      where,
    }),
  ]);

  // 6. Map to ISummary[]
  const data = rows.map(
    (post): IDiscussionBoardPost.ISummary => ({
      id: post.id,
      thread_id: post.thread_id,
      title: post.title,
      created_by_id: post.created_by_id,
      created_at: toISOStringSafe(post.created_at),
      is_locked: post.is_locked,
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
