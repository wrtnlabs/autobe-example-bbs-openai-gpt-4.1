import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Permanently remove a moderation log record from a moderation action's
 * workflow by ID.
 *
 * This function allows an administrator to erase (soft delete) a specific
 * moderation log record by its moderationLogId, provided it is associated with
 * the given moderationActionId and is not protected by an open appeal or legal
 * hold. The operation validates that the log is not already deleted, checks for
 * any referenced open appeals, performs a soft-delete by timestamping
 * deleted_at, and records the deletion in the global audit log.
 *
 * Authorization is enforced by the AdministratorPayload contract; only
 * authenticated administrators can invoke this operation.
 *
 * @param props - Function parameters
 * @param props.administrator - The authenticated administrator user
 * @param props.moderationActionId - The moderation action's unique identifier
 *   (UUID)
 * @param props.moderationLogId - The moderation log record's unique identifier
 *   (UUID)
 * @returns Void
 * @throws {Error} If the moderation log does not exist or is already deleted
 * @throws {Error} If the log is referenced by an open appeal or under
 *   legal/compliance hold
 */
export async function delete__discussBoard_administrator_moderationActions_$moderationActionId_moderationLogs_$moderationLogId(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  moderationLogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, moderationActionId, moderationLogId } = props;

  // Step 1: Find the moderation log for this action, ensure not already soft-deleted
  const log = await MyGlobal.prisma.discuss_board_moderation_logs.findFirst({
    where: {
      id: moderationLogId,
      related_action_id: moderationActionId,
      deleted_at: null,
    },
  });
  if (!log) {
    throw new Error("Moderation log not found or already deleted");
  }

  // Step 2: If log is referenced by an appeal, check the appeal status
  if (log.related_appeal_id !== null && log.related_appeal_id !== undefined) {
    const appeal = await MyGlobal.prisma.discuss_board_appeals.findFirst({
      where: {
        id: log.related_appeal_id,
      },
    });
    if (
      appeal &&
      (appeal.status === "pending" ||
        appeal.status === "in_review" ||
        appeal.status === "escalated")
    ) {
      throw new Error(
        "Cannot delete log referenced by an open appeal or under compliance hold",
      );
    }
  }

  // Step 3: Soft-delete the moderation log (set deleted_at)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.discuss_board_moderation_logs.update({
    where: { id: moderationLogId },
    data: { deleted_at: now },
  });

  // Step 4: Record the delete action in the global audit log
  await MyGlobal.prisma.discuss_board_global_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: administrator.id,
      actor_type: "administrator",
      action_category: "moderation_log_delete",
      target_table: "discuss_board_moderation_logs",
      target_id: moderationLogId,
      event_payload: null,
      event_description: `Administrator deleted moderation log ${moderationLogId}`,
      created_at: now,
      deleted_at: null,
    },
  });
}
