import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new poll attached to an existing post. Only authors, moderators, and
 * admins are allowed.
 *
 * This operation allows a user (with proper privileges) to create a new poll
 * linked to an existing post. The new poll will contain a required title,
 * options, and multi-choice flag. Polls cannot be created on posts that are
 * locked or archived. The operation performs all necessary input validation,
 * including options count and poll constraints as defined by the schema. This
 * writes a new row to the 'discussion_board_polls' table and cascades options
 * creation. Only the author of the post, moderators, or admins may create
 * polls. Audit/compliance logs capture poll creation event.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin session payload
 * @param props.postId - Identifier of the post to which the poll is being
 *   attached
 * @param props.body - Full poll creation data, including required title,
 *   options list, and constraints per the schema
 * @returns The fully defined, created poll record
 * @throws {Error} When the post does not exist, is locked, or is deleted
 * @throws {Error} When the parent thread is not found, archived, or deleted
 * @throws {Error} When a poll already exists for this post
 */
export async function post__discussionBoard_admin_posts_$postId_polls(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPoll.ICreate;
}): Promise<IDiscussionBoardPoll> {
  const { admin, postId, body } = props;

  // Step 1: Fetch post (must exist, not soft deleted, not locked)
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: postId },
  });
  if (!post || post.deleted_at) throw new Error("Post not found or deleted");
  if (post.is_locked) throw new Error("Post is locked");

  // Step 2: Fetch thread (must exist, not deleted, not archived)
  const thread = await MyGlobal.prisma.discussion_board_threads.findUnique({
    where: { id: post.thread_id },
  });
  if (!thread || thread.deleted_at)
    throw new Error("Parent thread not found or deleted");
  if (thread.is_archived) throw new Error("Thread is archived");

  // Step 3: Ensure no poll already exists for this post
  const pollCount = await MyGlobal.prisma.discussion_board_polls.count({
    where: { discussion_board_post_id: postId, deleted_at: null },
  });
  if (pollCount > 0) throw new Error("Poll already exists for this post");

  // Step 4: Create poll with correct dates
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discussion_board_polls.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_post_id: postId,
      title: body.title,
      description: body.description ?? null,
      multi_choice: body.multi_choice,
      opened_at: toISOStringSafe(body.opened_at),
      closed_at:
        body.closed_at !== undefined
          ? body.closed_at !== null
            ? toISOStringSafe(body.closed_at)
            : null
          : null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    discussion_board_post_id: created.discussion_board_post_id,
    title: created.title,
    description: created.description ?? null,
    multi_choice: created.multi_choice,
    opened_at: toISOStringSafe(created.opened_at),
    closed_at:
      created.closed_at !== undefined && created.closed_at !== null
        ? toISOStringSafe(created.closed_at)
        : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== undefined && created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
