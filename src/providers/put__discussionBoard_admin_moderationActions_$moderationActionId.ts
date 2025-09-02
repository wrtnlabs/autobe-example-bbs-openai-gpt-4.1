import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing moderation action record (e.g., restriction reason/time).
 *
 * This operation allows an admin to update business-updatable fields
 * (action_type, action_reason, details, effective_from, effective_until,
 * deleted_at) on a moderation action. Not allowed to update ownership, IDs,
 * audit, or relational fields unless explicitly permitted by business rules.
 * All changes are fully audited.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the update
 * @param props.moderationActionId - UUID identifying the moderation action to
 *   update
 * @param props.body - Update values, may include action type, reason, details,
 *   new time windows, or soft delete marker
 * @returns The updated moderation action object
 * @throws {Error} When moderation action does not exist or update is disallowed
 */
export async function put__discussionBoard_admin_moderationActions_$moderationActionId(props: {
  admin: AdminPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerationAction.IUpdate;
}): Promise<IDiscussionBoardModerationAction> {
  const { admin, moderationActionId, body } = props;

  // 1. Fetch the moderation action (throw if not found)
  const existing =
    await MyGlobal.prisma.discussion_board_moderation_actions.findUniqueOrThrow(
      {
        where: { id: moderationActionId },
      },
    );

  // 2. Prepare update object only for permitted fields
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.discussion_board_moderation_actions.update({
      where: { id: moderationActionId },
      data: {
        action_type: body.action_type ?? undefined,
        action_reason: body.action_reason ?? undefined,
        details: body.details ?? undefined,
        effective_from: body.effective_from ?? undefined,
        effective_until: body.effective_until ?? undefined,
        deleted_at: body.deleted_at ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    moderator_id: updated.moderator_id as string & tags.Format<"uuid">,
    user_id: updated.user_id
      ? (updated.user_id as string & tags.Format<"uuid">)
      : null,
    post_id: updated.post_id
      ? (updated.post_id as string & tags.Format<"uuid">)
      : null,
    comment_id: updated.comment_id
      ? (updated.comment_id as string & tags.Format<"uuid">)
      : null,
    action_type:
      updated.action_type as IDiscussionBoardModerationAction["action_type"],
    action_reason: updated.action_reason,
    details: updated.details ?? null,
    effective_from: toISOStringSafe(updated.effective_from),
    effective_until: updated.effective_until
      ? toISOStringSafe(updated.effective_until)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
