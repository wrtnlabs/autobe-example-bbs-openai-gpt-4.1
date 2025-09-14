import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieve all details for a specific moderation action from
 * discuss_board_moderation_actions by moderationActionId.
 *
 * This operation retrieves comprehensive details of a moderation action,
 * including the moderator, target member (if present), affected post or comment
 * (if present), appeal reference, action type and reason, narrative, status,
 * and created/updated timestamps. It strictly enforces access via moderator
 * authorization and ensures type correctness for compliance and audit
 * workflows. Throws an error if no such moderation action exists.
 *
 * @param props - Object with authentication and moderation action lookup
 *   parameters
 * @param props.moderator - The authenticated moderator requesting the details
 *   (validation is enforced by decorator)
 * @param props.moderationActionId - The UUID of the moderation action to
 *   retrieve
 * @returns IDiscussBoardModerationAction representing the full details of the
 *   moderation action
 * @throws {Error} If the moderation action is not found (404-like error)
 */
export async function get__discussBoard_moderator_moderationActions_$moderationActionId(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardModerationAction> {
  const { moderationActionId } = props;
  const record =
    await MyGlobal.prisma.discuss_board_moderation_actions.findUnique({
      where: {
        id: moderationActionId,
      },
    });
  if (record === null) {
    throw new Error("Moderation action not found");
  }
  return {
    id: record.id,
    moderator_id: record.moderator_id,
    target_member_id: record.target_member_id ?? undefined,
    target_post_id: record.target_post_id ?? undefined,
    target_comment_id: record.target_comment_id ?? undefined,
    appeal_id: record.appeal_id ?? undefined,
    action_type: record.action_type,
    action_reason: record.action_reason,
    decision_narrative: record.decision_narrative ?? undefined,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at !== null && record.deleted_at !== undefined
        ? toISOStringSafe(record.deleted_at)
        : undefined,
  };
}
