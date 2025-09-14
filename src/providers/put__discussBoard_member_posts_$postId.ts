import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update an existing discussBoard post by ID
 *
 * Allows an authenticated member to update the title, body, or business status
 * of their own post, subject to an edit window policy (30 minutes since
 * creation). Platform enforces title/body validation and blocks content
 * containing forbidden words or phrases (case-insensitive, regex-aware). Only
 * the post author may update their post through this endpoint; edit window
 * expiry, author mismatch, or business rule violations cause errors. If
 * successful, returns the updated post record. Tag assignment is not processed
 * by this endpoint.
 *
 * @param props - The update request properties
 * @param props.member - Authenticated member payload
 * @param props.postId - UUID of the post to update
 * @param props.body - Update fields for the post (title, body, business status)
 * @returns The updated discussBoard post
 * @throws {Error} If not found, soft-deleted, unauthorized, edit window
 *   expired, or business validation fails
 */
export async function put__discussBoard_member_posts_$postId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussBoardPost.IUpdate;
}): Promise<IDiscussBoardPost> {
  const { member, postId, body } = props;

  // Fetch post; must not be soft-deleted
  const post = await MyGlobal.prisma.discuss_board_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });
  if (!post) throw new Error("Post not found or already deleted");

  // Authorization: only the author may update, and only within edit window
  if (post.author_id !== member.id) {
    throw new Error("Only the author may update this post");
  }

  const now = toISOStringSafe(new Date());
  const createdAt = toISOStringSafe(post.created_at);
  const diffMs = new Date(now).getTime() - new Date(createdAt).getTime();
  if (diffMs > 30 * 60 * 1000) {
    throw new Error("Edit window (30 minutes) has expired");
  }

  // Validate title length if present
  if (body.title !== undefined) {
    if (body.title.length < 5 || body.title.length > 150) {
      throw new Error("Title must be 5-150 characters");
    }
  }
  // Validate body length if present
  if (body.body !== undefined) {
    if (body.body.length < 10 || body.body.length > 10000) {
      throw new Error("Body must be 10-10,000 characters");
    }
  }
  // Forbidden word policy (case-insensitive, regex)
  if (body.title !== undefined || body.body !== undefined) {
    const forbidden =
      await MyGlobal.prisma.discuss_board_forbidden_words.findMany({
        where: {
          deleted_at: null,
        },
      });
    for (const word of forbidden) {
      let regex: RegExp;
      try {
        regex = new RegExp(word.expression, "i");
      } catch {
        continue;
      }
      if (
        (body.title !== undefined && regex.test(body.title)) ||
        (body.body !== undefined && regex.test(body.body))
      ) {
        throw new Error("Post contains forbidden content");
      }
    }
  }

  // Update permitted fields; updated_at always refreshed
  const updated = await MyGlobal.prisma.discuss_board_posts.update({
    where: { id: postId },
    data: {
      title: body.title ?? undefined,
      body: body.body ?? undefined,
      business_status: body.business_status ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    author_id: updated.author_id,
    title: updated.title,
    body: updated.body,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
