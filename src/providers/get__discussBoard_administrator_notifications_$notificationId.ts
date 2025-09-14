import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardNotification";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve a specific notification event (discuss_board_notifications) by ID.
 *
 * Retrieves the details of a notification event by its unique ID from the
 * discuss_board_notifications table. The operation exposes full metadata,
 * including delivery channel, subject, body, status, event type, delivery
 * partner details, timestamps, and error information for compliance, auditing,
 * and troubleshooting support. Only authenticated administrators may retrieve
 * arbitrary notifications. Returns a clear error if the notification does not
 * exist.
 *
 * @param props - Object containing required parameters
 * @param props.administrator - The authenticated administrator payload
 * @param props.notificationId - The unique identifier (UUID) of the
 *   notification event to retrieve
 * @returns The detailed notification event record, matching
 *   IDiscussBoardNotification structure
 * @throws {Error} When the notification record does not exist or access is
 *   unauthorized
 */
export async function get__discussBoard_administrator_notifications_$notificationId(props: {
  administrator: AdministratorPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardNotification> {
  const { notificationId } = props;
  const notification =
    await MyGlobal.prisma.discuss_board_notifications.findUnique({
      where: { id: notificationId },
    });
  if (!notification) throw new Error("Notification not found");
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
    delivered_at: notification.delivered_at
      ? toISOStringSafe(notification.delivered_at)
      : null,
    error_message: notification.error_message ?? null,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
    deleted_at: notification.deleted_at
      ? toISOStringSafe(notification.deleted_at)
      : null,
  };
}
