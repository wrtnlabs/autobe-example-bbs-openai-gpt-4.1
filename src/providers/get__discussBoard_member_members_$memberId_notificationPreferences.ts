import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardUserNotificationPreference";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieve notification channel settings for a given member
 * (discuss_board_user_notification_preferences table).
 *
 * Fetches and returns all current notification channel preferences for the
 * given member, including email, sms, push, and newsletter options. Uses the
 * discuss_board_user_notification_preferences table with filtering via memberId
 * path parameter.
 *
 * Enforces strict access: only the member (profile owner) may view preferences,
 * with application logic checking that the requesting user matches the
 * requested memberId. This data is privacy-sensitive but not generally exposed
 * publically; it primarily supports user management and notification delivery
 * workflows.
 *
 * @param props - The request parameters
 * @param props.member - The authenticated member payload making the request
 * @param props.memberId - UUID of the target member whose preferences are being
 *   retrieved
 * @returns The notification channel settings for the member
 * @throws {Error} If the authenticated member does not match the memberId
 * @throws {Error} If no notification preferences are found for the member
 */
export async function get__discussBoard_member_members_$memberId_notificationPreferences(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardUserNotificationPreference> {
  const { member, memberId } = props;
  // Only the member can read their own notification preferences (administrator not supported for this endpoint)
  if (member.id !== memberId) {
    throw new Error(
      "Unauthorized: Can only access your own notification preferences",
    );
  }
  const preference =
    await MyGlobal.prisma.discuss_board_user_notification_preferences.findFirst(
      {
        where: { member_id: memberId, deleted_at: null },
      },
    );
  if (!preference) {
    throw new Error("Notification preferences not found for this member");
  }
  return {
    id: preference.id,
    member_id: preference.member_id,
    email_notifications_enabled: preference.email_notifications_enabled,
    sms_notifications_enabled: preference.sms_notifications_enabled,
    push_notifications_enabled: preference.push_notifications_enabled,
    newsletter_opt_in: preference.newsletter_opt_in,
    created_at: toISOStringSafe(preference.created_at),
    updated_at: toISOStringSafe(preference.updated_at),
    deleted_at: preference.deleted_at
      ? toISOStringSafe(preference.deleted_at)
      : undefined,
  };
}
