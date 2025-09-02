import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Soft delete (retire) a moderation action for audit compliance.
 *
 * Softly retires a specified moderation action, setting its `deleted_at` field
 * (soft delete). Only authenticated moderators or admins (via ModeratorPayload)
 * may invoke this. This endpoint is used for audit and regulatory compliance,
 * making the action record invisible in routine APIs but still retrievable for
 * audits. Throws if action is already retired or does not exist.
 *
 * @param props - Request properties
 * @param props.moderator - Authenticated moderator (ModeratorPayload)
 *   performing the soft delete
 * @param props.moderationActionId - The unique UUID of the moderation action to
 *   soft-delete (retire)
 * @returns The retired moderation action as an IDiscussionBoardModerationAction
 * @throws {Error} If the moderation action does not exist or is already retired
 */
export async function delete__discussionBoard_moderator_moderationActions_$moderationActionId(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationAction> {
  const { moderationActionId } = props;

  // Retrieve active (not retired) moderation action by ID
  const moderationAction =
    await MyGlobal.prisma.discussion_board_moderation_actions.findFirst({
      where: {
        id: moderationActionId,
        deleted_at: null,
      },
    });
  if (!moderationAction) {
    throw new Error("Moderation action not found or already retired.");
  }

  // Set deleted_at timestamp for soft deletion-audit (now)
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updated =
    await MyGlobal.prisma.discussion_board_moderation_actions.update({
      where: { id: moderationActionId },
      data: { deleted_at: deletedAt },
    });

  // All ISO date conversions for API DTO output
  return {
    id: updated.id,
    moderator_id: updated.moderator_id,
    user_id: updated.user_id ?? null,
    post_id: updated.post_id ?? null,
    comment_id: updated.comment_id ?? null,
    action_type: updated.action_type as
      | "warn"
      | "mute"
      | "remove"
      | "edit"
      | "restrict"
      | "restore"
      | "escalate",
    action_reason: updated.action_reason,
    details: updated.details ?? null,
    effective_from: toISOStringSafe(updated.effective_from),
    effective_until: updated.effective_until
      ? toISOStringSafe(updated.effective_until)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: deletedAt,
  };
}
