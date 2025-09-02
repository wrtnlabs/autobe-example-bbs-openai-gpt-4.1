import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPoll";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Create a new poll attached to an existing post. Only authors, moderators, and
 * admins are allowed.
 *
 * This operation allows a moderator to create a poll for an existing post,
 * provided the post is not locked and its thread is not archived. It also
 * ensures only one poll may exist per post. All business and API contract rules
 * are strictly enforced.
 *
 * @param props - Request properties
 * @param props.moderator - Authentication payload (moderator)
 * @param props.postId - ID of the post to attach the poll to
 * @param props.body - Poll creation data (title, options, multi_choice,
 *   opened_at, closed_at, description)
 * @returns The created poll as IDiscussionBoardPoll
 * @throws Error if post does not exist, is deleted, locked, or its thread is
 *   archived, or if a poll already exists for the post
 */
export async function post__discussionBoard_moderator_posts_$postId_polls(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPoll.ICreate;
}): Promise<IDiscussionBoardPoll> {
  const { postId, body } = props;
  // 1. Fetch post+thread to validate business rules
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    include: {
      thread: true,
    },
  });
  if (!post) throw new Error("Post not found or deleted");
  if (post.is_locked) throw new Error("Cannot create poll on locked post");
  if (!post.thread || post.thread.is_archived)
    throw new Error("Cannot create poll on archived thread");
  // 2. Ensure only one poll per post
  const existingPoll = await MyGlobal.prisma.discussion_board_polls.findFirst({
    where: {
      discussion_board_post_id: postId,
      deleted_at: null,
    },
  });
  if (existingPoll) throw new Error("A poll already exists for this post");
  // 3. Create the poll
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discussion_board_polls.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_post_id: postId,
      title: body.title,
      description: body.description ?? null,
      multi_choice: body.multi_choice,
      opened_at: toISOStringSafe(body.opened_at),
      closed_at: body.closed_at ? toISOStringSafe(body.closed_at) : null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 4. Return DTO-conformant poll
  return {
    id: created.id as string & tags.Format<"uuid">,
    discussion_board_post_id: created.discussion_board_post_id as string &
      tags.Format<"uuid">,
    title: created.title,
    description: created.description ?? null,
    multi_choice: created.multi_choice,
    opened_at: toISOStringSafe(created.opened_at),
    closed_at: created.closed_at ? toISOStringSafe(created.closed_at) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
