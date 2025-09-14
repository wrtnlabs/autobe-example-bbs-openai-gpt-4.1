import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardNotification";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieve details for a specific notification event sent to a discussBoard
 * member.
 *
 * Fetches a notification by ID from the discuss_board_notifications table,
 * ensuring it belongs to the requesting member and is not soft-deleted. Returns
 * full notification metadata, including event type, delivery channel, subject,
 * body, external message ID, delivery status, delivery attempts, timestamps,
 * and error/info fields.
 *
 * Only the recipient member may access their own notification. Attempts to
 * access another user's notification or a nonexistent/soft-deleted notification
 * will result in an error.
 *
 * @param props - Function parameters
 * @param props.member - Authenticated member (MemberPayload) making the request
 * @param props.notificationId - UUID of the notification to retrieve
 * @returns The IDiscussBoardNotification object for the given ID
 * @throws {Error} If no notification with the given ID exists or it does not
 *   belong to the member
 */
export async function get__discussBoard_member_notifications_$notificationId(props: {
  member: MemberPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardNotification> {
  const { member, notificationId } = props;
  const notification =
    await MyGlobal.prisma.discuss_board_notifications.findFirst({
      where: {
        id: notificationId,
        deleted_at: null,
      },
    });

  if (!notification) {
    throw new Error("Notification not found");
  }
  if (notification.user_account_id !== member.id) {
    throw new Error("Unauthorized: This notification does not belong to you");
  }

  return {
    id: notification.id,
    user_account_id: notification.user_account_id,
    source_post_id: notification.source_post_id ?? null,
    event_type: notification.event_type,
    delivery_channel: notification.delivery_channel,
    subject: notification.subject,
    body: notification.body,
    external_message_id: notification.external_message_id ?? null,
    delivery_status: notification.delivery_status,
    delivery_attempts: notification.delivery_attempts,
    delivered_at:
      notification.delivered_at !== undefined &&
      notification.delivered_at !== null
        ? toISOStringSafe(notification.delivered_at)
        : null,
    error_message: notification.error_message ?? null,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
    deleted_at:
      notification.deleted_at !== undefined && notification.deleted_at !== null
        ? toISOStringSafe(notification.deleted_at)
        : null,
  };
}
