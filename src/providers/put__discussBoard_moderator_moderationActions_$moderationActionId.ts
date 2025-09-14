import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update an existing moderation action in discuss_board_moderation_actions.
 *
 * This endpoint allows a moderator to update an existing moderation action with
 * new details (decision narrative, status, action_type, action_reason, or
 * appeal linkage). Only the moderator who originally created the moderation
 * action may perform updates. Attempts by others will result in a permission
 * error. Business constraints prevent edits to deleted actions.
 *
 * All changes update the updated_at timestamp to the current time. The response
 * returns the updated moderation action in full detail with all timestamps
 * properly formatted as ISO 8601 strings.
 *
 * @param props - Update props
 * @param props.moderator - The authenticated moderator payload (must match
 *   action author)
 * @param props.moderationActionId - The moderation action ID to update
 * @param props.body - The set of fields to update (action_type, action_reason,
 *   decision_narrative, status, appeal_id)
 * @returns The updated moderation action record
 * @throws {Error} If the action does not exist, is deleted, or is not owned by
 *   the acting moderator
 */
export async function put__discussBoard_moderator_moderationActions_$moderationActionId(props: {
  moderator: ModeratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: IDiscussBoardModerationAction.IUpdate;
}): Promise<IDiscussBoardModerationAction> {
  const { moderator, moderationActionId, body } = props;

  // Step 1: Fetch the action (must not be deleted)
  const action =
    await MyGlobal.prisma.discuss_board_moderation_actions.findFirst({
      where: { id: moderationActionId, deleted_at: null },
    });
  if (!action) {
    throw new Error("Moderation action not found or has been deleted");
  }

  // Step 2: Ownership check (only creator moderator may update)
  if (action.moderator_id !== moderator.id) {
    throw new Error(
      "Permission denied: only the creator moderator can update this moderation action",
    );
  }

  // Step 3: Apply allowed updates (only whitelisted fields; always update updated_at)
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

  // Step 4: Return, converting DateTime fields correctly
  return {
    id: updated.id,
    moderator_id: updated.moderator_id,
    target_member_id: updated.target_member_id ?? null,
    target_post_id: updated.target_post_id ?? null,
    target_comment_id: updated.target_comment_id ?? null,
    appeal_id: updated.appeal_id ?? null,
    action_type: updated.action_type,
    action_reason: updated.action_reason,
    decision_narrative: updated.decision_narrative ?? null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
