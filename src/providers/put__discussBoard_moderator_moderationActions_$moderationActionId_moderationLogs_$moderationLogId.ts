import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationLogs";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update an existing moderation log record in the moderation workflow for an
 * action.
 *
 * This endpoint allows authorized moderators to update the event_details
 * (narrative/context) field of an existing moderation workflow log. All
 * immutable references (such as related_action_id and id) are enforced by
 * lookup, and only event_details is allowed to be changed. This operation is
 * strictly limited to moderators. Audit fields such as created_at and
 * deleted_at are maintained for compliance.
 *
 * @param props - The request context and update payload
 * @param props.moderator - Authenticated moderator payload (authorization
 *   enforced by decorator)
 * @param props.moderationActionId - UUID of the moderation action this log must
 *   be linked to
 * @param props.moderationLogId - UUID of the moderation log to update
 * @param props.body - Body containing the mutable event_details (may be string,
 *   null, or undefined)
 * @returns The updated moderation log entry as a DTO
 * @throws {Error} If the log does not exist or is not linked to the specified
 *   moderationActionId
 */
export async function put__discussBoard_moderator_moderationActions_$moderationActionId_moderationLogs_$moderationLogId(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  moderationLogId: string & tags.Format<"uuid">;
  body: IDiscussBoardModerationLogs.IUpdate;
}): Promise<IDiscussBoardModerationLogs> {
  const { moderator, moderationActionId, moderationLogId, body } = props;

  // Find log by id and related_action_id to enforce linkage
  const log = await MyGlobal.prisma.discuss_board_moderation_logs.findFirst({
    where: {
      id: moderationLogId,
      related_action_id: moderationActionId,
    },
  });
  if (!log) {
    throw new Error(
      "Moderation log not found or not linked to this moderationActionId",
    );
  }

  // Update only the allowed mutable field(s)
  const updated = await MyGlobal.prisma.discuss_board_moderation_logs.update({
    where: { id: moderationLogId },
    data: {
      event_details: body.event_details ?? null,
    },
  });

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
  };
}
