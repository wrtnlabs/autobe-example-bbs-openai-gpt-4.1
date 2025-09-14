import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationAction";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update an existing moderation action in discuss_board_moderation_actions.
 * Moderator/admin only.
 *
 * This operation updates specific fields of an existing moderation action
 * record: decision_narrative, status, action_reason, and appeal linkage (if
 * provided). Only authenticated administrators are permitted to perform this
 * update. The implementation enforces that the target record exists, is not
 * soft-deleted, and only updates allowed fields. All changes are reflected in
 * audit trail via updated_at, and all date fields are string &
 * tags.Format<'date-time'>. No native Date type or type assertions are
 * present.
 *
 * @param props - Object containing the following properties:
 *
 *   - Administrator: AdministratorPayload; Authenticated administrator making this
 *       request
 *   - ModerationActionId: UUID of the moderation action to update
 *   - Body: IDiscussBoardModerationAction.IUpdate; Fields to update for the
 *       moderation action record
 *
 * @returns IDiscussBoardModerationAction - The updated moderation action record
 *   with all fields present and date fields as ISO8601 strings
 * @throws {Error} If the moderation action does not exist or is already
 *   soft-deleted
 */
export async function put__discussBoard_administrator_moderationActions_$moderationActionId(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: IDiscussBoardModerationAction.IUpdate;
}): Promise<IDiscussBoardModerationAction> {
  const { moderationActionId, body } = props;
  // Fetch the moderation action that is not soft-deleted
  const existing =
    await MyGlobal.prisma.discuss_board_moderation_actions.findFirst({
      where: {
        id: moderationActionId,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new Error("Moderation action not found or already deleted");
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discuss_board_moderation_actions.update(
    {
      where: { id: moderationActionId },
      data: {
        action_type: body.action_type ?? undefined,
        action_reason: body.action_reason ?? undefined,
        decision_narrative: body.decision_narrative ?? undefined,
        status: body.status ?? undefined,
        appeal_id: body.appeal_id ?? undefined,
        updated_at: now,
      },
    },
  );
  // Map all model fields, converting date fields to correct ISO string formats
  return {
    id: updated.id,
    moderator_id: updated.moderator_id,
    target_member_id: updated.target_member_id ?? undefined,
    target_post_id: updated.target_post_id ?? undefined,
    target_comment_id: updated.target_comment_id ?? undefined,
    appeal_id: updated.appeal_id ?? undefined,
    action_type: updated.action_type,
    action_reason: updated.action_reason,
    decision_narrative: updated.decision_narrative ?? undefined,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
