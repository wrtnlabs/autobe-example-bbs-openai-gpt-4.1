import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationSubscription";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update a specific notification subscription by id for the authenticated user.
 *
 * Allows users to unsubscribe, change which specific resource (post, category,
 * etc.) they are following, or otherwise modify their notification subscription
 * state. Only the subscription record belonging to the requesting user can be
 * modified; attempts to update others' subscriptions are denied. Setting
 * deleted_at performs a soft unsubscribe. The update only affects explicitly
 * provided fields.
 *
 * @param props - Request properties
 * @param props.user - Authenticated user's payload (ownership required)
 * @param props.subscriptionId - ID of the notification subscription to update
 * @param props.body - Fields to update on the subscription
 *   (subscription_target_type, subscription_target_id, deleted_at)
 * @returns The updated notification subscription entity with proper date/time
 *   formatting and type branding.
 * @throws {Error} When the subscription is not found or the user is not
 *   authorized
 */
export async function put__discussionBoard_user_notificationSubscriptions_$subscriptionId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardNotificationSubscription.IUpdate;
}): Promise<IDiscussionBoardNotificationSubscription> {
  const { user, subscriptionId, body } = props;
  // Fetch the subscription (by id)
  const subscription =
    await MyGlobal.prisma.discussion_board_notification_subscriptions.findUnique(
      {
        where: { id: subscriptionId },
      },
    );
  if (!subscription) throw new Error("Subscription not found");
  if (subscription.user_id !== user.id)
    throw new Error("Unauthorized: You do not own this subscription");
  // Prepare update fields - only include fields that are provided
  const updateFields: {
    subscription_target_type?: string;
    subscription_target_id?: string & tags.Format<"uuid">;
    deleted_at?: (string & tags.Format<"date-time">) | null;
  } = {};
  if (body.subscription_target_type !== undefined) {
    updateFields.subscription_target_type = body.subscription_target_type;
  }
  if (body.subscription_target_id !== undefined) {
    updateFields.subscription_target_id = body.subscription_target_id;
  }
  if (body.deleted_at !== undefined) {
    // Always convert using toISOStringSafe if value is not null
    updateFields.deleted_at =
      body.deleted_at === null ? null : toISOStringSafe(body.deleted_at);
  }
  // Update record
  const updated =
    await MyGlobal.prisma.discussion_board_notification_subscriptions.update({
      where: { id: subscriptionId },
      data: updateFields,
    });
  // Compose DTO with correct ISO date conversion (created_at, deleted_at)
  return {
    id: updated.id,
    user_id: updated.user_id,
    subscription_target_type: updated.subscription_target_type,
    subscription_target_id: updated.subscription_target_id,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
