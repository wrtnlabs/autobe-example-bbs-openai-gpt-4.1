import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update an existing discussion thread by ID (discussion_board_threads).
 *
 * Update a thread's properties, such as title or status (lock/archive), by its
 * unique identifier. The request body should contain only the editable fields
 * permitted by system policy. Thread ownership is required unless the acting
 * user is a moderator or admin, who may update any thread per community or
 * moderation guidelines.
 *
 * All updates are tracked via the thread's updated_at field and may be
 * accompanied by audit log entries or edit history per compliance. Soft
 * deletion is not supported by this endpoint. Title changes are validated for
 * uniqueness.
 *
 * Errors include thread not found, permission denied, and validation failures.
 * Only authenticated users, moderators, or admins may perform updates.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user making the request
 * @param props.threadId - ID of the thread to update
 * @param props.body - Update payload for the discussion thread. Only editable
 *   fields should be sent.
 * @returns The updated thread information after modification
 * @throws {Error} When thread does not exist, user lacks permission, or unique
 *   constraint is violated
 */
export async function put__discussionBoard_user_threads_$threadId(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  body: IDiscussionBoardThread.IUpdate;
}): Promise<IDiscussionBoardThread> {
  const { user, threadId, body } = props;

  // Step 1: Fetch the thread (must exist and not deleted)
  const thread = await MyGlobal.prisma.discussion_board_threads.findFirst({
    where: {
      id: threadId,
      deleted_at: null,
    },
  });
  if (!thread) throw new Error("Thread not found");

  // Step 2: Authorization - only the thread owner may edit (mod/admin role not available in this context)
  if (thread.created_by_id !== user.id) {
    throw new Error(
      "Permission denied: Only the thread owner may update this thread",
    );
  }

  // Step 3: Attempt to update permitted fields; set updated_at to now
  let updated: typeof thread;
  try {
    updated = await MyGlobal.prisma.discussion_board_threads.update({
      where: { id: threadId },
      data: {
        title: body.title ?? undefined,
        is_locked: body.is_locked ?? undefined,
        is_archived: body.is_archived ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } catch (err: any) {
    // Prisma throws on unique violation or bad input
    if (
      err?.code === "P2002" &&
      Array.isArray(err.meta?.target) &&
      err.meta.target.includes("title")
    ) {
      throw new Error("Title must be unique");
    }
    throw err;
  }

  // Step 4: Format response using correct date string handling
  return {
    id: updated.id,
    created_by_id: updated.created_by_id,
    title: updated.title,
    is_locked: updated.is_locked,
    is_archived: updated.is_archived,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
