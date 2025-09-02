import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Get details of a specific moderation action taken by staff.
 *
 * Retrieve the full detail of a specific moderation action, including all
 * relational context and action notes. Accessible only by moderation staff for
 * security, audit, and operational clarity. Ensures compliance requirements
 * regarding moderation transparency and traceability are met, supporting
 * integrity in community governance.
 *
 * @param props - Request properties
 * @param props.moderator - Authenticated moderator making the request
 * @param props.moderationActionId - Unique identifier of the moderation action
 * @returns Complete moderation action record with all details
 * @throws {Error} When the moderation action is not found or access is
 *   unauthorized
 */
export async function get__discussionBoard_moderator_moderationActions_$moderationActionId(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerationAction> {
  const { moderator, moderationActionId } = props;

  // Fetch moderation action by id (only if not soft-deleted)
  const record =
    await MyGlobal.prisma.discussion_board_moderation_actions.findFirst({
      where: {
        id: moderationActionId,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new Error("Moderation action not found");
  }

  return {
    id: record.id,
    moderator_id: record.moderator_id,
    user_id: record.user_id ?? null,
    post_id: record.post_id ?? null,
    comment_id: record.comment_id ?? null,
    action_type: record.action_type as
      | "warn"
      | "mute"
      | "remove"
      | "edit"
      | "restrict"
      | "restore"
      | "escalate",
    action_reason: record.action_reason,
    details: record.details ?? null,
    effective_from: toISOStringSafe(record.effective_from),
    effective_until: record.effective_until
      ? toISOStringSafe(record.effective_until)
      : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
