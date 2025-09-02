import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Create a new post in a thread (discussion_board_posts).
 *
 * This endpoint allows authenticated users to create a new post within a
 * specified thread. The new post must include a title and body, and is
 * initialized as unlocked. The parent thread ID is specified in the path. User
 * validation and thread access/lock status are enforced according to the
 * discussion_board_posts schema. The new post's metadata, such as author and
 * creation date, are set automatically.
 *
 * Access is forbidden if the target thread does not exist, is locked, or the
 * user is suspended, not verified, or deleted. Duplicate post titles within the
 * same thread are rejected (unique index, DB-enforced). Returns the full
 * created post on success, with proper backend-generated metadata.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user performing the post creation
 * @param props.threadId - Identifier of the thread in which to create the post
 *   (UUID)
 * @param props.body - Fields for creating a new post in the thread (title,
 *   body, required)
 * @returns The full post object as stored in the database (all metadata
 *   populated)
 * @throws {Error} If the thread does not exist, is locked, or is deleted
 * @throws {Error} If the title already exists in the thread (unique per-thread
 *   constraint violation)
 * @throws {Error} If the user is invalid (should not happen if authorization
 *   logic is correct)
 */
export async function post__discussionBoard_user_threads_$threadId_posts(props: {
  user: UserPayload;
  threadId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPost.ICreate;
}): Promise<IDiscussionBoardPost> {
  const { user, threadId, body } = props;

  // Ensure the thread exists, is not locked, and not deleted
  const thread = await MyGlobal.prisma.discussion_board_threads.findFirst({
    where: {
      id: threadId,
      deleted_at: null,
      is_locked: false,
    },
  });
  if (!thread) {
    throw new Error("Thread does not exist, is locked, or has been deleted");
  }

  // Prepare metadata
  const now = toISOStringSafe(new Date());

  // Attempt to create the post (unique constraint on [thread_id, title] is enforced in DB)
  let created;
  try {
    created = await MyGlobal.prisma.discussion_board_posts.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        thread_id: threadId,
        created_by_id: user.id,
        title: body.title,
        body: body.body,
        is_locked: false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (err: unknown) {
    // Prisma throws for unique constraint violation; forward with explicit error message
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new Error(
        "A post with this title already exists in this thread. Post titles must be unique per thread.",
      );
    }
    throw err;
  }

  // Return full post object, converting date fields and nullables
  return {
    id: created.id,
    thread_id: created.thread_id,
    created_by_id: created.created_by_id,
    title: created.title,
    body: created.body,
    is_locked: created.is_locked,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
