import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationAction";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve details for a specific moderation action from
 * discuss_board_moderation_actions by moderationActionId.
 *
 * This endpoint allows administrators to fetch all details of a specific
 * moderation action using its unique identifier. It provides complete context
 * including moderation actor, target member, affected content, action
 * rationale, audit attributes, and workflow state. Only authenticated
 * administrators with active privileges may access this endpoint, enabling
 * audit, escalation, business, or forensic review workflows. Throws 404 if the
 * moderation action does not exist, or 403 if administrator authorization is
 * lost (the authorization decorator enforces this by contract).
 *
 * @param props - Function parameters
 * @param props.administrator - Authenticated administrator payload (enforced by
 *   decorator)
 * @param props.moderationActionId - The unique identifier (UUID) of the
 *   moderation action to fetch
 * @returns Detailed IDiscussBoardModerationAction record
 * @throws {Error} Throws if no matching moderation action exists, or if admin
 *   privileges are lost
 */
export async function get__discussBoard_administrator_moderationActions_$moderationActionId(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardModerationAction> {
  const { moderationActionId } = props;
  const action =
    await MyGlobal.prisma.discuss_board_moderation_actions.findUniqueOrThrow({
      where: { id: moderationActionId },
    });
  return {
    id: action.id,
    moderator_id: action.moderator_id,
    target_member_id: action.target_member_id ?? undefined,
    target_post_id: action.target_post_id ?? undefined,
    target_comment_id: action.target_comment_id ?? undefined,
    appeal_id: action.appeal_id ?? undefined,
    action_type: action.action_type,
    action_reason: action.action_reason,
    decision_narrative: action.decision_narrative ?? undefined,
    status: action.status,
    created_at: toISOStringSafe(action.created_at),
    updated_at: toISOStringSafe(action.updated_at),
    deleted_at: action.deleted_at
      ? toISOStringSafe(action.deleted_at)
      : undefined,
  };
}
