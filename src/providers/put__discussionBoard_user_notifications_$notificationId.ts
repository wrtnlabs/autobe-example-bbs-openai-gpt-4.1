import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update the status of a notification (read, unread, archived, etc.) by
 * notificationId.
 *
 * Allows the authenticated recipient to update their notification's status,
 * such as marking it as read, archived, or returning it to unread. This
 * operates on the discussion_board_notifications table, supporting workflows
 * like clearing notification badges, organizing the notification center, and
 * archiving for later review.
 *
 * Strictly enforces that only the recipient may update their own notification,
 * and only if the notification is not soft-deleted. Only the status and
 * (optionally) read_at fields may be updated; all other data is preserved as in
 * the original notification.
 *
 * @param props - Properties for updating notification status
 * @param props.user - Authenticated user payload representing the acting
 *   recipient
 * @param props.notificationId - The UUID of the notification to update
 * @param props.body - Object specifying the new status (and optionally read_at
 *   timestamp; omitted or null to clear)
 * @returns The notification record reflecting the updated status in API
 *   contract format
 * @throws {Error} If notification not found, is not owned by the user, or is
 *   already deleted/irreversible
 */
export async function put__discussionBoard_user_notifications_$notificationId(props: {
  user: UserPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardNotification.IUpdate;
}): Promise<IDiscussionBoardNotification> {
  const { user, notificationId, body } = props;

  // Step 1: Fetch the notification
  const notification =
    await MyGlobal.prisma.discussion_board_notifications.findUnique({
      where: { id: notificationId },
    });
  if (!notification) throw new Error("Notification not found");

  // Step 2: Ownership check
  if (notification.recipient_user_id !== user.id) {
    throw new Error("Forbidden: You can only modify your own notifications");
  }

  // Step 3: Soft-delete check (deleted_at not null)
  if (notification.deleted_at !== null) {
    throw new Error("Notification already deleted");
  }

  // Step 4: Update notification status and optionally read_at
  const updated = await MyGlobal.prisma.discussion_board_notifications.update({
    where: { id: notificationId },
    data: {
      status: body.status,
      read_at: body.read_at ?? null,
    },
  });

  // Step 5: Return in API contract structure with branded types and proper date formatting
  return {
    id: updated.id,
    recipient_user_id: updated.recipient_user_id,
    actor_user_id: updated.actor_user_id ?? null,
    post_id: updated.post_id ?? null,
    comment_id: updated.comment_id ?? null,
    type: updated.type,
    status: updated.status,
    title: updated.title ?? null,
    body: updated.body ?? null,
    action_url: updated.action_url ?? null,
    failure_reason: updated.failure_reason ?? null,
    created_at: toISOStringSafe(updated.created_at),
    delivered_at: updated.delivered_at
      ? toISOStringSafe(updated.delivered_at)
      : null,
    read_at: updated.read_at ? toISOStringSafe(updated.read_at) : null,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
