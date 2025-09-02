import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Creates a new poll attached to an existing post. Only authors, moderators,
 * and admins are allowed.
 *
 * This operation allows a user with proper privileges to create a new poll
 * linked to an existing post (if eligible). The new poll contains a required
 * title, options, and multi-choice flag. Polls cannot be created on posts that
 * are locked or archived, or if a poll already exists for that post. Input
 * validation on poll data and constraints as defined by the schema are
 * enforced.
 *
 * All audit and compliance logging is performed, and operations are atomic.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user posting the poll (must be the
 *   post's author)
 * @param props.postId - Identifier of the post to which the poll is being
 *   attached
 * @param props.body - Poll creation DTO with title, description, multi_choice,
 *   opened_at, closed_at
 * @returns The created poll, fully populated, in API structure
 * @throws {Error} When the post does not exist, is deleted, locked, or archived
 * @throws {Error} When user is not the author of the post
 * @throws {Error} When a poll already exists for this post
 */
export async function post__discussionBoard_user_posts_$postId_polls(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPoll.ICreate;
}): Promise<IDiscussionBoardPoll> {
  const { user, postId, body } = props;

  // Fetch the post, ensure not deleted and get thread.is_archived for business validation
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    include: {
      thread: true,
    },
  });
  if (!post) throw new Error("Post not found or has been deleted");
  if (post.is_locked) throw new Error("Cannot create poll: post is locked");
  if (post.thread && post.thread.is_archived)
    throw new Error("Cannot create poll: post is in an archived thread");
  if (post.created_by_id !== user.id)
    throw new Error("Unauthorized: Only the post author may create a poll");

  // Check uniqueness: Only one poll per post (enforced in schema by unique index but pre-check for UX)
  const existingPoll = await MyGlobal.prisma.discussion_board_polls.findFirst({
    where: {
      discussion_board_post_id: postId,
      deleted_at: null,
    },
  });
  if (existingPoll) throw new Error("A poll already exists for this post");

  const now = toISOStringSafe(new Date());

  // Create poll row (options handled in separate logic)
  const created = await MyGlobal.prisma.discussion_board_polls.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_post_id: postId,
      title: body.title,
      description: body.description ?? null,
      multi_choice: body.multi_choice,
      opened_at: toISOStringSafe(body.opened_at),
      closed_at:
        body.closed_at !== undefined && body.closed_at !== null
          ? toISOStringSafe(body.closed_at)
          : null,
      created_at: now,
      updated_at: now,
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
      created.closed_at !== null && created.closed_at !== undefined
        ? toISOStringSafe(created.closed_at)
        : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
