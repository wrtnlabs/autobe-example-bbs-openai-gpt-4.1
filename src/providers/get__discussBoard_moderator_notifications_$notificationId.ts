import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardNotification";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieve a specific notification event (discuss_board_notifications) by ID.
 *
 * This function fetches notification details for a moderator by notificationId,
 * enforcing strict access control: only the owning moderator can access their
 * notifications. Data is mapped from the discuss_board_notifications table to
 * IDiscussBoardNotification, with all date fields serialized as ISO8601 strings
 * (no Date type used anywhere).
 *
 * @param props - Contains the authenticated moderator payload and
 *   notificationId
 *
 *   - Moderator: The authenticated ModeratorPayload (must match user_account_id)
 *   - NotificationId: UUID of the notification to retrieve
 *
 * @returns The full notification detail as IDiscussBoardNotification
 * @throws {Error} If the notification does not exist or is not accessible by
 *   this moderator
 */
export async function get__discussBoard_moderator_notifications_$notificationId(props: {
  moderator: ModeratorPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardNotification> {
  const { moderator, notificationId } = props;
  const notification =
    await MyGlobal.prisma.discuss_board_notifications.findUnique({
      where: { id: notificationId },
    });
  if (!notification) {
    throw new Error("Notification not found");
  }
  if (notification.user_account_id !== moderator.id) {
    throw new Error(
      "Access denied: you are not the recipient of this notification",
    );
  }
  return {
    id: notification.id,
    user_account_id: notification.user_account_id,
    source_post_id: notification.source_post_id ?? undefined,
    event_type: notification.event_type,
    delivery_channel: notification.delivery_channel,
    subject: notification.subject,
    body: notification.body,
    external_message_id: notification.external_message_id ?? undefined,
    delivery_status: notification.delivery_status,
    delivery_attempts: notification.delivery_attempts,
    delivered_at: notification.delivered_at
      ? toISOStringSafe(notification.delivered_at)
      : undefined,
    error_message: notification.error_message ?? undefined,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
    deleted_at: notification.deleted_at
      ? toISOStringSafe(notification.deleted_at)
      : undefined,
  };
}
