import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete (retire) a moderation action for audit compliance.
 *
 * Soft delete (retire) a specific moderation action, setting its deleted_at
 * timestamp for logical deletion and audit compliance. The record remains
 * visible in audits but not returned in regular API queries. Only moderators or
 * admins can perform this function; the API enforces permissions and validates
 * action existence. Soft-deleted moderation actions cannot be enforced and are
 * treated as obsolete in business workflows.
 *
 * Every record soft-deleted here is auditable and traceable. Attempting to
 * delete a non-existent or already retired moderation action will result in a
 * clear error. Soft deletion supports legal compliance, as all moderation
 * changes remain discoverable in case of investigation.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the soft deletion
 * @param props.moderationActionId - The UUID of the moderation action to retire
 * @returns The updated moderation action record marked as deleted
 * @throws {Error} When the record is not found or already retired
 */
export async function delete__discussionBoard_admin_moderationActions_$moderationActionId(props: {
  admin: AdminPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationAction> {
  const { moderationActionId } = props;
  // 1. Fetch moderation action by id (must not be already soft-deleted)
  const moderationAction =
    await MyGlobal.prisma.discussion_board_moderation_actions.findUnique({
      where: { id: moderationActionId },
    });
  if (!moderationAction) throw new Error("Moderation action not found");
  if (moderationAction.deleted_at !== null)
    throw new Error("Moderation action is already retired");

  const now = toISOStringSafe(new Date());

  // 2. Perform the soft delete (set deleted_at)
  const updated =
    await MyGlobal.prisma.discussion_board_moderation_actions.update({
      where: { id: moderationActionId },
      data: { deleted_at: now },
    });

  // 3. Return API DTO, branding all fields and using type assertion for literal unions as needed
  return {
    id: updated.id as string & tags.Format<"uuid">,
    moderator_id: updated.moderator_id as string & tags.Format<"uuid">,
    user_id: (updated.user_id ?? null) as (string & tags.Format<"uuid">) | null,
    post_id: (updated.post_id ?? null) as (string & tags.Format<"uuid">) | null,
    comment_id: (updated.comment_id ?? null) as
      | (string & tags.Format<"uuid">)
      | null,
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
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
