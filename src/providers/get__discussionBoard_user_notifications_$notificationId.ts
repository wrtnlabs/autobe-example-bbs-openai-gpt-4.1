import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieve notification details by notificationId for the authenticated user.
 *
 * Allows an authenticated user to fetch the full details of a single
 * notification sent to them. Ensures that only the intended recipient may
 * access the notification. Throws errors if the notification does not exist, is
 * deleted, or the user is not the recipient.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user making the request
 * @param props.notificationId - The unique identifier of the notification to
 *   retrieve
 * @returns The detailed notification as IDiscussionBoardNotification
 * @throws {Error} If notification is not found, deleted, or access is forbidden
 */
export async function get__discussionBoard_user_notifications_$notificationId(props: {
  user: UserPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardNotification> {
  const { user, notificationId } = props;
  const row = await MyGlobal.prisma.discussion_board_notifications.findFirst({
    where: {
      id: notificationId,
      deleted_at: null,
    },
  });
  if (!row) throw new Error("Notification not found");
  if (row.recipient_user_id !== user.id)
    throw new Error("Forbidden: not your notification");
  return {
    id: row.id,
    recipient_user_id: row.recipient_user_id,
    actor_user_id: row.actor_user_id ?? null,
    post_id: row.post_id ?? null,
    comment_id: row.comment_id ?? null,
    type: row.type,
    status: row.status,
    title: row.title ?? null,
    body: row.body ?? null,
    action_url: row.action_url ?? null,
    failure_reason: row.failure_reason ?? null,
    created_at: toISOStringSafe(row.created_at),
    delivered_at: row.delivered_at ? toISOStringSafe(row.delivered_at) : null,
    read_at: row.read_at ? toISOStringSafe(row.read_at) : null,
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  };
}
