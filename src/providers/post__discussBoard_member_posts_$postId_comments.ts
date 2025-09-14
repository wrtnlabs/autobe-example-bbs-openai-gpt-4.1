import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new comment under a specific post (discuss_board_comments).
 *
 * This function enables an authenticated member to create a comment on a given
 * post. It enforces business validations: content length, forbidden words,
 * parent relationship, and nesting depth. Author/member id is derived from the
 * session. Returns the full created comment with all fields for front-end
 * usage.
 *
 * @param props - Properties for creating a comment
 * @param props.member - The authenticated member performing this action
 * @param props.postId - The target post's UUID to attach the comment
 * @param props.body - The comment creation details (content, optional
 *   parent_id)
 * @returns The newly created comment, fully populated for UI
 * @throws {Error} If content length invalid, forbidden word found, post not
 *   found, or parent invalid/nesting illegal
 */
export async function post__discussBoard_member_posts_$postId_comments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussBoardComment.ICreate;
}): Promise<IDiscussBoardComment> {
  const { member, postId, body } = props;

  // 1. Validate content length (enforced min 2, max 2000 by business rule)
  if (body.content.length < 2 || body.content.length > 2000) {
    throw new Error("Content length must be between 2 and 2000 characters.");
  }

  // 2. Check forbidden words (case-insensitive, including multi-word phrases)
  const forbiddenWords =
    await MyGlobal.prisma.discuss_board_forbidden_words.findMany({
      where: { deleted_at: null },
    });
  for (const word of forbiddenWords) {
    // Match as substring, case-insensitive
    if (body.content.toLowerCase().includes(word.expression.toLowerCase())) {
      throw new Error("Content contains forbidden word or phrase.");
    }
  }

  // 3. If parent_id is given, verify existence, post match, and nesting depth
  let depth = 0;
  if (body.parent_id !== undefined && body.parent_id !== null) {
    const parent = await MyGlobal.prisma.discuss_board_comments.findFirst({
      where: { id: body.parent_id, deleted_at: null },
    });
    if (!parent) throw new Error("Parent comment does not exist.");
    if (parent.discuss_board_post_id !== postId)
      throw new Error("Parent comment belongs to a different post.");
    // Maximum allowed nesting depth for replies. Set by business rule (example: 4)
    if (parent.depth >= 4)
      throw new Error("Maximum comment nesting depth exceeded.");
    depth = parent.depth + 1;
  }

  // 4. Ensure target post exists
  const post = await MyGlobal.prisma.discuss_board_posts.findFirst({
    where: { id: postId },
  });
  if (!post) throw new Error("Target post does not exist.");

  // 5. Prepare all values (immutable)
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 6. Create the comment in DB (all nullable and required fields set correctly)
  const created = await MyGlobal.prisma.discuss_board_comments.create({
    data: {
      id,
      discuss_board_post_id: postId,
      parent_id: body.parent_id ?? null,
      author_member_id: member.id,
      content: body.content,
      depth,
      is_locked: false,
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 7. Map DB result to API DTO (convert all timestamps correctly, preserve nulls)
  const result: IDiscussBoardComment = {
    id: created.id,
    discuss_board_post_id: created.discuss_board_post_id,
    parent_id: created.parent_id === undefined ? null : created.parent_id,
    author_member_id: created.author_member_id,
    content: created.content,
    depth: created.depth,
    is_locked: created.is_locked,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
  return result;
}
