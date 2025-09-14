import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationAction";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Create a new moderation action record in discuss_board_moderation_actions.
 * Moderator/admin only.
 *
 * This operation records an official moderation intervention by an
 * administrator—including content removals, warnings, bans, or other business
 * actions—by creating a persistent audit-trail row. It will set all required
 * fields, generate a UUID for the action, and mark both created_at/updated_at
 * to the same current timestamp.
 *
 * @param props - Input object with:
 *
 *   - Administrator: Authenticated AdministratorPayload
 *   - Body: Moderation action creation data (ID, target refs, business fields)
 *
 * @returns IDiscussBoardModerationAction - Complete object matching schema,
 *   fully typed, with all fields normalized (nullable, date, and required
 *   pattern).
 * @throws {Error} If creation or database errors occur
 */
export async function post__discussBoard_administrator_moderationActions(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardModerationAction.ICreate;
}): Promise<IDiscussBoardModerationAction> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  const created = await MyGlobal.prisma.discuss_board_moderation_actions.create(
    {
      data: {
        id,
        moderator_id: props.body.moderator_id,
        target_member_id: props.body.target_member_id ?? null,
        target_post_id: props.body.target_post_id ?? null,
        target_comment_id: props.body.target_comment_id ?? null,
        appeal_id: props.body.appeal_id ?? null,
        action_type: props.body.action_type,
        action_reason: props.body.action_reason,
        decision_narrative: props.body.decision_narrative ?? null,
        status: props.body.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    moderator_id: created.moderator_id,
    target_member_id: created.target_member_id ?? null,
    target_post_id: created.target_post_id ?? null,
    target_comment_id: created.target_comment_id ?? null,
    appeal_id: created.appeal_id ?? null,
    action_type: created.action_type,
    action_reason: created.action_reason,
    decision_narrative: created.decision_narrative ?? null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
