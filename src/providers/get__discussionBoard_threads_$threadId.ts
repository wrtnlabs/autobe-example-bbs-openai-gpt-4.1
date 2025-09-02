import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";

/**
 * Retrieve a single discussion thread by ID (discussion_board_threads).
 *
 * This operation retrieves detailed information about a discussion thread,
 * including its title, status (locked/archived), creation timestamp, and
 * creator details based on the discussion_board_threads schema.
 *
 * Only threads that have not been soft-deleted (where deleted_at is null) are
 * accessible. Associated posts, replies, or author details are not included.
 *
 * Permissions: All roles (visitor, user, moderator, admin) may access this
 * endpoint to display public thread information.
 *
 * @param props - Request properties
 * @param props.threadId - Unique identifier of the discussion thread to
 *   retrieve
 * @returns The full discussion thread details as defined by
 *   IDiscussionBoardThread
 * @throws {Error} When the thread is not found or has been soft-deleted
 */
export async function get__discussionBoard_threads_$threadId(props: {
  threadId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardThread> {
  const { threadId } = props;
  const thread = await MyGlobal.prisma.discussion_board_threads.findFirst({
    where: {
      id: threadId,
      deleted_at: null,
    },
    select: {
      id: true,
      created_by_id: true,
      title: true,
      is_locked: true,
      is_archived: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!thread) throw new Error("Thread not found or has been deleted");
  return {
    id: thread.id,
    created_by_id: thread.created_by_id,
    title: thread.title,
    is_locked: thread.is_locked,
    is_archived: thread.is_archived,
    created_at: toISOStringSafe(thread.created_at),
    updated_at: toISOStringSafe(thread.updated_at),
    deleted_at: thread.deleted_at ? toISOStringSafe(thread.deleted_at) : null,
  };
}
