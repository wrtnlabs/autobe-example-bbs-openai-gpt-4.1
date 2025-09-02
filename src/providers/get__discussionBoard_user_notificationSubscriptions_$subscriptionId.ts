import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationSubscription";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieves the details of a specific notification subscription by its unique
 * identifier.
 *
 * This endpoint allows an authenticated user to fetch all the metadata of a
 * notification subscription they own, including the target entity type, its id,
 * creation time, and (if applicable) deletion time. Access is strictly limited
 * to the owner of the subscription. Security and privacy requirements dictate
 * that no user may access another user's notification subscriptions.
 *
 * @param props - Request properties
 * @param props.user - Authenticated user payload (owner of the subscription)
 * @param props.subscriptionId - Unique ID of the notification subscription to
 *   retrieve
 * @returns The full notification subscription record, including soft-delete
 *   status
 * @throws {Error} If the subscription does not exist or does not belong to the
 *   user
 */
export async function get__discussionBoard_user_notificationSubscriptions_$subscriptionId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardNotificationSubscription> {
  const { user, subscriptionId } = props;

  // Enforce ownership directly in the query: the user can access only their own subscriptions
  const sub =
    await MyGlobal.prisma.discussion_board_notification_subscriptions.findFirst(
      {
        where: {
          id: subscriptionId,
          user_id: user.id,
        },
        select: {
          id: true,
          user_id: true,
          subscription_target_type: true,
          subscription_target_id: true,
          created_at: true,
          deleted_at: true,
        },
      },
    );

  if (!sub) {
    throw new Error("Notification subscription not found or not owned by user");
  }

  return {
    id: sub.id,
    user_id: sub.user_id,
    subscription_target_type: sub.subscription_target_type,
    subscription_target_id: sub.subscription_target_id,
    created_at: toISOStringSafe(sub.created_at),
    deleted_at: sub.deleted_at ? toISOStringSafe(sub.deleted_at) : null,
  };
}
