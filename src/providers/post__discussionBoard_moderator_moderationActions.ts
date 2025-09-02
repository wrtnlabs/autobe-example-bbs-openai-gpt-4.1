import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Create a new moderation action (warn, remove, restrict, etc.) by a moderator
 * or admin.
 *
 * This endpoint allows moderators (or admins) to log any actionable moderation
 * decision: warning, muting, restricting, removing, editing, restoring, or
 * escalating users, posts, or comments for compliance and content governance.
 * Must ensure that the acting moderator matches the authenticated moderator and
 * that any referenced target (user, post, comment) exists and is not
 * soft-deleted. All date and enum fields are branded/unioned as required.
 *
 * @param props - Request properties
 * @param props.moderator - The authenticated moderator's payload.
 * @param props.body - Moderation action creation details (targets, type,
 *   reason, effective times, etc).
 * @returns The newly created moderation action record, fully resolved and
 *   suitable for audit logging and enforcement logic.
 * @throws {Error} If referenced moderator target (user, post, comment) does not
 *   exist or is soft-deleted.
 * @throws {Error} If acting moderator_id does not match authenticated
 *   moderator.
 */
export async function post__discussionBoard_moderator_moderationActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationAction.ICreate;
}): Promise<IDiscussionBoardModerationAction> {
  const { moderator, body } = props;
  // 1. Verify actor's moderator privileges and that the action's moderator_id matches authentication
  if (body.moderator_id !== moderator.id) {
    throw new Error(
      "Forbidden: moderator_id does not match your authenticated moderator.",
    );
  }
  // 2. Target existence validation for all foreign keys (and not soft-deleted)
  if (body.user_id !== undefined && body.user_id !== null) {
    const userTarget = await MyGlobal.prisma.discussion_board_users.findFirst({
      where: { id: body.user_id, deleted_at: null },
    });
    if (!userTarget)
      throw new Error("Target user does not exist or is deleted.");
  }
  if (body.post_id !== undefined && body.post_id !== null) {
    const postTarget = await MyGlobal.prisma.discussion_board_posts.findFirst({
      where: { id: body.post_id, deleted_at: null },
    });
    if (!postTarget)
      throw new Error("Target post does not exist or is deleted.");
  }
  if (body.comment_id !== undefined && body.comment_id !== null) {
    const commentTarget =
      await MyGlobal.prisma.discussion_board_comments.findFirst({
        where: { id: body.comment_id, deleted_at: null },
      });
    if (!commentTarget)
      throw new Error("Target comment does not exist or is deleted.");
  }
  // 3. Compose and create moderation action record (all date fields as ISO string)
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.discussion_board_moderation_actions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderator_id: moderator.id,
        user_id: body.user_id ?? null,
        post_id: body.post_id ?? null,
        comment_id: body.comment_id ?? null,
        action_type: body.action_type as
          | "warn"
          | "mute"
          | "remove"
          | "edit"
          | "restrict"
          | "restore"
          | "escalate",
        action_reason: body.action_reason,
        details: body.details ?? null,
        effective_from: body.effective_from,
        effective_until: body.effective_until ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  // 4. Return DTO
  return {
    id: created.id as string & tags.Format<"uuid">,
    moderator_id: created.moderator_id as string & tags.Format<"uuid">,
    user_id: created.user_id ?? null,
    post_id: created.post_id ?? null,
    comment_id: created.comment_id ?? null,
    action_type: created.action_type as
      | "warn"
      | "mute"
      | "remove"
      | "edit"
      | "restrict"
      | "restore"
      | "escalate",
    action_reason: created.action_reason,
    details: created.details ?? null,
    effective_from: toISOStringSafe(created.effective_from),
    effective_until: created.effective_until
      ? toISOStringSafe(created.effective_until)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
