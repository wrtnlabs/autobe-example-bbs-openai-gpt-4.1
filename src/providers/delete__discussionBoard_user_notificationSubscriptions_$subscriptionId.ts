import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Soft delete (unsubscribe) a user's notification subscription by id.
 *
 * This function marks a notification subscription as deleted by setting the
 * deleted_at field to the current timestamp. Only the subscription owner may
 * perform this operation. Throws if the subscription does not exist, is already
 * deleted, or does not belong to the requesting user.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user performing the operation
 * @param props.subscriptionId - The unique id of the notification subscription
 *   to be deleted (soft deleted)
 * @returns Void
 * @throws {Error} If the subscription does not exist, is already deleted, or
 *   does not belong to the authenticated user
 */
export async function delete__discussionBoard_user_notificationSubscriptions_$subscriptionId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, subscriptionId } = props;
  // 1. Fetch the subscription, ensure it exists and is not already deleted
  const subscription =
    await MyGlobal.prisma.discussion_board_notification_subscriptions.findFirst(
      {
        where: {
          id: subscriptionId,
          deleted_at: null,
        },
      },
    );
  if (!subscription)
    throw new Error("Subscription not found or already deleted");
  // 2. Authorization: Only owner may soft-delete
  if (subscription.user_id !== user.id) {
    throw new Error("Forbidden: Cannot delete another user's subscription");
  }
  // 3. Soft delete by setting deleted_at
  await MyGlobal.prisma.discussion_board_notification_subscriptions.update({
    where: { id: subscriptionId },
    data: {
      deleted_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  // 4. Return void
  return;
}
