import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationLogs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

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
 * Access is restricted to administrators. Returned fields include actors,
 * event_type, event_details, and timestamps. This operation is critical for
 * reconstructing histories and investigating workflow correctness in
 * disciplinary reviews or user appeals.
 *
 * @param props - Parameters for retrieving the moderation log
 * @param props.administrator - The authenticated administrator performing the
 *   operation
 * @param props.moderationActionId - ID of the moderation action to which the
 *   log is attached
 * @param props.moderationLogId - ID of the moderation log record to retrieve
 * @returns The complete moderation log record including metadata and escalation
 *   context
 * @throws {Error} If the moderation log is not found for the provided
 *   moderationActionId and moderationLogId
 */
export async function get__discussBoard_administrator_moderationActions_$moderationActionId_moderationLogs_$moderationLogId(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  moderationLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardModerationLogs> {
  const { moderationActionId, moderationLogId } = props;

  const record = await MyGlobal.prisma.discuss_board_moderation_logs.findFirst({
    where: {
      id: moderationLogId,
      related_action_id: moderationActionId,
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

  if (!record) throw new Error("Moderation log not found");

  return {
    id: record.id,
    actor_member_id: record.actor_member_id ?? undefined,
    related_action_id: record.related_action_id ?? undefined,
    related_appeal_id: record.related_appeal_id ?? undefined,
    related_report_id: record.related_report_id ?? undefined,
    event_type: record.event_type,
    event_details: record.event_details ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
