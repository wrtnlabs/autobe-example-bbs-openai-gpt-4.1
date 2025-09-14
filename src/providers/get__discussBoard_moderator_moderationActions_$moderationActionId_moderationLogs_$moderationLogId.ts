import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationLogs";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieve the details of a specific moderation log entry for a moderation
 * action.
 *
 * Retrieves the detailed record of a specific moderation log event attached to
 * a moderation action. This operation queries the discuss_board_moderation_logs
 * table based on both moderationActionId and moderationLogId, responding with
 * the comprehensive log entry, including actors, event type, timestamps,
 * narrative, and escalation linkages. Supports review and compliance workflow
 * for administrators and moderators.
 *
 * Access is restricted to users with appropriate moderation privileges.
 * Returned fields include actors, event_type, event_details, and timestamps.
 * This operation is critical for reconstructing histories and investigating
 * workflow correctness in disciplinary reviews or user appeals.
 *
 * @param props - Object containing all necessary parameters for this operation
 * @param props.moderator - The authenticated moderator requesting the log entry
 * @param props.moderationActionId - The unique ID of the parent moderation
 *   action
 * @param props.moderationLogId - The unique ID of the moderation log record to
 *   retrieve
 * @returns The complete moderation log record, conforming to
 *   IDiscussBoardModerationLogs
 * @throws {Error} If the moderation log record is not found or user is not
 *   authorized
 */
export async function get__discussBoard_moderator_moderationActions_$moderationActionId_moderationLogs_$moderationLogId(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  moderationLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardModerationLogs> {
  const { moderationActionId, moderationLogId } = props;
  const log =
    await MyGlobal.prisma.discuss_board_moderation_logs.findFirstOrThrow({
      where: {
        id: moderationLogId,
        related_action_id: moderationActionId,
        deleted_at: null,
      },
      select: {
        id: true,
        actor_member_id: true,
        related_action_id: true,
        related_appeal_id: true,
        related_report_id: true,
        event_type: true,
        event_details: true,
        created_at: true,
        deleted_at: true,
      },
    });
  return {
    id: log.id,
    actor_member_id: log.actor_member_id ?? undefined,
    related_action_id: log.related_action_id ?? undefined,
    related_appeal_id: log.related_appeal_id ?? undefined,
    related_report_id: log.related_report_id ?? undefined,
    event_type: log.event_type,
    event_details: log.event_details ?? undefined,
    created_at: toISOStringSafe(log.created_at),
    deleted_at: log.deleted_at ? toISOStringSafe(log.deleted_at) : undefined,
  };
}
