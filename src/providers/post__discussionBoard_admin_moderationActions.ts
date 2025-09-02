import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new moderation action (warn, remove, restrict, etc.) by a moderator
 * or admin.
 *
 * This operation writes a new moderation action record for compliance and
 * audit, enforcing platform policies on users, posts, or comments. The action
 * is created by a moderator/admin and can include fields linking to users,
 * posts, or comments.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the action
 * @param props.body - Information about the moderation action (target, type,
 *   reason, timing)
 * @returns The created moderation action record with all business and audit
 *   fields.
 * @throws {Error} If required relationships do not exist or action_type is
 *   invalid
 */
export async function post__discussionBoard_admin_moderationActions(props: {
  admin: AdminPayload;
  body: IDiscussionBoardModerationAction.ICreate;
}): Promise<IDiscussionBoardModerationAction> {
  const {
    body: {
      moderator_id,
      user_id,
      post_id,
      comment_id,
      action_type,
      action_reason,
      details,
      effective_from,
      effective_until,
    },
  } = props;

  // Ensure incoming body validates the allowed enum for action_type via typia
  typia.assert<IDiscussionBoardModerationAction.ICreate>(props.body);

  // All system fields
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.discussion_board_moderation_actions.create({
      data: {
        id,
        moderator_id,
        user_id,
        post_id,
        comment_id,
        action_type: action_type, // assert guarantees enum
        action_reason,
        details,
        effective_from,
        effective_until: effective_until ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    moderator_id: created.moderator_id,
    user_id: created.user_id ?? null,
    post_id: created.post_id ?? null,
    comment_id: created.comment_id ?? null,
    action_type:
      created.action_type as IDiscussionBoardModerationAction["action_type"],
    action_reason: created.action_reason,
    details: created.details ?? null,
    effective_from: toISOStringSafe(created.effective_from),
    effective_until: created.effective_until
      ? toISOStringSafe(created.effective_until)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
