import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Soft-delete a notification for the authenticated user, removing it from their
 * notification center.
 *
 * This operation marks the notification as deleted using the deleted_at field.
 * Only the notification recipient may perform this operation. System and
 * critical compliance notifications may be protected from deletion by future
 * business logic. Deletion is permanent from the recipient's perspective, but
 * retained in the database for compliance/audit.
 *
 * @param props - Request props
 * @param props.user - Authenticated user (recipient)
 * @param props.notificationId - Unique identifier of the notification to be
 *   deleted
 * @returns Void
 * @throws {Error} If the notification does not exist
 * @throws {Error} If the notification is already deleted
 * @throws {Error} If the user is not the notification's recipient
 */
export async function delete__discussionBoard_user_notifications_$notificationId(props: {
  user: UserPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, notificationId } = props;
  const notification =
    await MyGlobal.prisma.discussion_board_notifications.findUnique({
      where: { id: notificationId },
    });
  if (!notification) {
    throw new Error("Notification not found");
  }
  if (notification.deleted_at !== null) {
    throw new Error("Notification already deleted");
  }
  if (notification.recipient_user_id !== user.id) {
    throw new Error(
      "Not authorized: Only the recipient may delete this notification",
    );
  }
  await MyGlobal.prisma.discussion_board_notifications.update({
    where: { id: notificationId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  return;
}
