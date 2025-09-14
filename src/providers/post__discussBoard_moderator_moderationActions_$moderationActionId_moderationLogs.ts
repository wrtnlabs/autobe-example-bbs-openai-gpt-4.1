import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationLogs";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Create a new log record in the moderation workflow for a given moderation
 * action.
 *
 * This endpoint allows an authenticated moderator to append a structured event
 * log to a moderation action's workflow. The log records event type, details,
 * the acting moderator, and links to the relevant moderation action (and
 * optionally, related appeal or report). All logs are timestamped and fully
 * auditable, supporting compliance and action history analysis.
 *
 * Only users with active moderator privileges may create moderation logs. The
 * system enforces traceability by resolving the moderator's active member id
 * from the ModeratorPayload; actor identity is never taken from external
 * input.
 *
 * @param props - Properties for log creation
 * @param props.moderator - The authenticated moderator payload (must be active)
 * @param props.moderationActionId - The UUID of the moderation action to anchor
 *   the log event
 * @param props.body - The moderation log event information (event_type,
 *   event_details, and references)
 * @returns The created moderation log entry with full metadata and traceability
 * @throws {Error} If the moderator's member id cannot be resolved or if the
 *   operation fails
 */
export async function post__discussBoard_moderator_moderationActions_$moderationActionId_moderationLogs(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: IDiscussBoardModerationLogs.ICreate;
}): Promise<IDiscussBoardModerationLogs> {
  // Resolve the moderator's member_id strictly by their user_account_id (payload.id)
  const member = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      user_account_id: props.moderator.id,
      deleted_at: null,
      status: "active",
    },
    select: { id: true },
  });
  if (!member)
    throw new Error("Moderator member account not found or inactive");

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const logId: string & tags.Format<"uuid"> = v4();

  const created = await MyGlobal.prisma.discuss_board_moderation_logs.create({
    data: {
      id: logId,
      actor_member_id: member.id,
      related_action_id: props.moderationActionId,
      related_appeal_id: props.body.related_appeal_id ?? undefined,
      related_report_id: props.body.related_report_id ?? undefined,
      event_type: props.body.event_type,
      event_details: props.body.event_details ?? undefined,
      created_at: now,
      // deleted_at: not set on create
    },
  });

  return {
    id: created.id,
    actor_member_id: created.actor_member_id ?? undefined,
    related_action_id: created.related_action_id ?? undefined,
    related_appeal_id: created.related_appeal_id ?? undefined,
    related_report_id: created.related_report_id ?? undefined,
    event_type: created.event_type,
    event_details: created.event_details ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
