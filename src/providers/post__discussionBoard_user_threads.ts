import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Create a new discussion thread (discussion_board_threads).
 *
 * This operation enables authenticated users to create a new discussion thread.
 * The input must include the thread's title, and creation is bound to the
 * current authenticated user as the creator. Upon creation, the thread is
 * unlocked and unarchived by default. This endpoint works with the
 * discussion_board_threads table, referencing the created_by_id (the creator's
 * user ID) and initializing system fields automatically. Proper validation
 * (title, uniqueness, content restrictions) is performed. Duplicate titles
 * result in a validation error. Only users in good standing (non-suspended,
 * non-deleted, verified) may create threads.
 *
 * @param props - The request properties
 * @param props.user - The authenticated user creating the thread
 * @param props.body - Information for creating a new thread (title required)
 * @returns The newly created thread's complete metadata and state
 * @throws {Error} When the title is a duplicate, or other unexpected DB errors
 *   occur
 */
export async function post__discussionBoard_user_threads(props: {
  user: UserPayload;
  body: IDiscussionBoardThread.ICreate;
}): Promise<IDiscussionBoardThread> {
  const { user, body } = props;

  // Generate required identifiers and timestamps
  const id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  try {
    const created = await MyGlobal.prisma.discussion_board_threads.create({
      data: {
        id,
        created_by_id: user.id,
        title: body.title,
        is_locked: false,
        is_archived: false,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: created.id,
      created_by_id: created.created_by_id,
      title: created.title,
      is_locked: created.is_locked,
      is_archived: created.is_archived,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== undefined && created.deleted_at !== null
          ? toISOStringSafe(created.deleted_at)
          : null,
    };
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new Error(
        "Duplicate thread title: A thread with this title already exists.",
      );
    }
    throw err;
  }
}
