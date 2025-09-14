import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Create a new moderation action record in discuss_board_moderation_actions.
 * Moderator/admin only.
 *
 * This operation creates a moderation action row documenting official
 * interventions by moderators or administrators—such as content removal,
 * warnings, suspensions, or escalation. Foreign key references are assumed
 * valid if provided (target_member_id, target_post_id, etc.). Timestamps are
 * auto-assigned.
 *
 * @param props - Object containing all parameters for moderation action
 *   creation
 * @param props.moderator - The authenticated moderator performing this action
 * @param props.body - Moderation action creation details (target, type,
 *   rationale, status, etc.)
 * @returns IDiscussBoardModerationAction with all audit fields and assigned
 *   UUID
 */
export async function post__discussBoard_moderator_moderationActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussBoardModerationAction.ICreate;
}): Promise<IDiscussBoardModerationAction> {
  const { moderator, body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  // Insert moderation action
  const created = await MyGlobal.prisma.discuss_board_moderation_actions.create(
    {
      data: {
        id,
        moderator_id: body.moderator_id,
        target_member_id: body.target_member_id ?? null,
        target_post_id: body.target_post_id ?? null,
        target_comment_id: body.target_comment_id ?? null,
        appeal_id: body.appeal_id ?? null,
        action_type: body.action_type,
        action_reason: body.action_reason,
        decision_narrative: body.decision_narrative ?? null,
        status: body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    moderator_id: created.moderator_id,
    target_member_id: created.target_member_id ?? undefined,
    target_post_id: created.target_post_id ?? undefined,
    target_comment_id: created.target_comment_id ?? undefined,
    appeal_id: created.appeal_id ?? undefined,
    action_type: created.action_type,
    action_reason: created.action_reason,
    decision_narrative: created.decision_narrative ?? undefined,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
