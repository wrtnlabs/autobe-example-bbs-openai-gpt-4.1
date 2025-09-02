import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update an existing moderation action record (e.g., restriction reason/time).
 *
 * This operation allows an authorized moderator to update allowed audit fields
 * for a specific moderation action. All business-updatable fields (action_type,
 * action_reason, details, effective_from, effective_until, deleted_at) are
 * supported; immutable fields are untouched.
 *
 * @param props - Request properties
 * @param props.moderator - Moderator authentication payload. Must be valid
 *   moderator (enforced by decorator).
 * @param props.moderationActionId - UUID of the moderation action to update
 * @param props.body - IDiscussionBoardModerationAction.IUpdate (fields to
 *   update)
 * @returns The updated moderation action record
 * @throws {Error} When the moderation action does not exist or is soft-deleted
 */
export async function put__discussionBoard_moderator_moderationActions_$moderationActionId(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerationAction.IUpdate;
}): Promise<IDiscussionBoardModerationAction> {
  const { moderationActionId, body } = props;

  // 1. Find the moderation action and ensure it's not soft-deleted
  const moderationAction =
    await MyGlobal.prisma.discussion_board_moderation_actions.findFirst({
      where: {
        id: moderationActionId,
        deleted_at: null,
      },
    });
  if (!moderationAction)
    throw new Error("Moderation action not found or already deleted");

  // 2. Update only business-permitted fields. (Do not include immutable fields.)
  const updated =
    await MyGlobal.prisma.discussion_board_moderation_actions.update({
      where: { id: moderationActionId },
      data: {
        action_type: body.action_type ?? undefined,
        action_reason: body.action_reason ?? undefined,
        details: body.details ?? undefined,
        effective_from: body.effective_from ?? undefined,
        effective_until: body.effective_until ?? undefined,
        deleted_at: body.deleted_at ?? undefined,
        // updated_at is automatically managed by Prisma's @updatedAt
      },
    });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    moderator_id: updated.moderator_id as string & tags.Format<"uuid">,
    user_id: updated.user_id
      ? (updated.user_id as string & tags.Format<"uuid">)
      : null,
    post_id: updated.post_id
      ? (updated.post_id as string & tags.Format<"uuid">)
      : null,
    comment_id: updated.comment_id
      ? (updated.comment_id as string & tags.Format<"uuid">)
      : null,
    action_type: updated.action_type as
      | "warn"
      | "mute"
      | "remove"
      | "edit"
      | "restrict"
      | "restore"
      | "escalate", // Prisma returns string; safe cast
    action_reason: updated.action_reason,
    details: updated.details ?? null,
    effective_from: toISOStringSafe(updated.effective_from),
    effective_until: updated.effective_until
      ? toISOStringSafe(updated.effective_until)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
