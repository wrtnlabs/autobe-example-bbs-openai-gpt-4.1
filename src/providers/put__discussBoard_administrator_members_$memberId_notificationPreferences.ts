import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardUserNotificationPreference";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update notification settings for a member account
 * (discuss_board_user_notification_preferences table).
 *
 * Applies changes to a member's notification delivery preferences, taking new
 * configuration from the request body and applying them to the specified member
 * by memberId. Only the member themself or administrators may alter these
 * settings, and all inputs are validated for proper boolean semantics.
 *
 * This operation updates the discuss_board_user_notification_preferences table
 * using validated payloads (IDiscussBoardUserNotificationPreference.IUpdate),
 * changing whether email, sms, push notifications or newsletters are enabled
 * for the user. The updated_at timestamp is refreshed, and an audit log is
 * created for record-keeping.
 *
 * @param props - The operation props.
 * @param props.administrator - Administrator JWT context.
 * @param props.memberId - UUID of the member whose notification preferences are
 *   being updated.
 * @param props.body - Updated notification settings for the target member.
 * @returns The updated notification preference record.
 * @throws {Error} If the notification preference record does not exist or is
 *   soft-deleted.
 */
export async function put__discussBoard_administrator_members_$memberId_notificationPreferences(props: {
  administrator: AdministratorPayload;
  memberId: string & tags.Format<"uuid">;
  body: IDiscussBoardUserNotificationPreference.IUpdate;
}): Promise<IDiscussBoardUserNotificationPreference> {
  const now = toISOStringSafe(new Date());
  // Find notification preference row for memberId that is not deleted
  const pref =
    await MyGlobal.prisma.discuss_board_user_notification_preferences.findFirst(
      {
        where: { member_id: props.memberId, deleted_at: null },
      },
    );
  if (!pref) throw new Error("Notification preference not found");
  const updated =
    await MyGlobal.prisma.discuss_board_user_notification_preferences.update({
      where: { id: pref.id },
      data: {
        email_notifications_enabled:
          props.body.email_notifications_enabled ?? undefined,
        sms_notifications_enabled:
          props.body.sms_notifications_enabled ?? undefined,
        push_notifications_enabled:
          props.body.push_notifications_enabled ?? undefined,
        newsletter_opt_in: props.body.newsletter_opt_in ?? undefined,
        updated_at: now,
      },
    });
  return {
    id: updated.id,
    member_id: updated.member_id,
    email_notifications_enabled: updated.email_notifications_enabled,
    sms_notifications_enabled: updated.sms_notifications_enabled,
    push_notifications_enabled: updated.push_notifications_enabled,
    newsletter_opt_in: updated.newsletter_opt_in,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
