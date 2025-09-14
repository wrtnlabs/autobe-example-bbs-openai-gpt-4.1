import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationLogs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update an existing moderation log record in the moderation workflow for an
 * action.
 *
 * Modifies the event_details of a specific moderation log entry, ensuring only
 * the narrative/commentary is changed. Ensures strict audit and workflow
 * integrity by not allowing alteration of immutable foreign keys or
 * non-editable fields. Only privileged administrators can perform this
 * operation. Throws an error if the moderation log does not exist or is not
 * tied to the provided moderation action.
 *
 * @param props - The operation parameters.
 * @param props.administrator - The authenticated administrator payload
 *   performing the update.
 * @param props.moderationActionId - The moderation action the log must belong
 *   to.
 * @param props.moderationLogId - The specific log record being updated.
 * @param props.body - The update payload (only event_details is mutable).
 * @returns The updated IDiscussBoardModerationLogs reflecting the new event
 *   details.
 * @throws Error if record not found or linkage invalid.
 */
export async function put__discussBoard_administrator_moderationActions_$moderationActionId_moderationLogs_$moderationLogId(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  moderationLogId: string & tags.Format<"uuid">;
  body: IDiscussBoardModerationLogs.IUpdate;
}): Promise<IDiscussBoardModerationLogs> {
  const { moderationActionId, moderationLogId, body } = props;
  // Fetch existing log (ensure it exists and is correctly linked)
  const found = await MyGlobal.prisma.discuss_board_moderation_logs.findUnique({
    where: { id: moderationLogId },
  });
  if (!found) throw new Error("Moderation log not found");
  if (found.related_action_id !== moderationActionId) {
    throw new Error(
      "Moderation log does not belong to the provided moderation action",
    );
  }
  // Update only the event_details field
  const updated = await MyGlobal.prisma.discuss_board_moderation_logs.update({
    where: { id: moderationLogId },
    data: { event_details: body.event_details ?? undefined },
  });
  // Convert all Date values to branded strings and respect nulls
  return {
    id: updated.id,
    actor_member_id: updated.actor_member_id ?? undefined,
    related_action_id: updated.related_action_id ?? undefined,
    related_appeal_id: updated.related_appeal_id ?? undefined,
    related_report_id: updated.related_report_id ?? undefined,
    event_type: updated.event_type,
    event_details: updated.event_details ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  } satisfies IDiscussBoardModerationLogs;
}
