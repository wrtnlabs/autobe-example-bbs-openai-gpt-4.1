import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardUserNotificationPreference";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve notification channel settings for a given member
 * (discuss_board_user_notification_preferences table).
 *
 * Fetches and returns all current notification channel preferences for the
 * given member, including email, sms, push, and newsletter options. Uses the
 * discuss_board_user_notification_preferences table with filtering via memberId
 * path parameter.
 *
 * Only administrators (via AdministratorPayload) or the member themself can
 * access this endpoint; this implementation assumes administrator context from
 * the props. If no record is found for the provided memberId (or if
 * soft-deleted), an error is thrown. All datetime fields are returned as ISO
 * 8601 strings as required by DTO signature conventions. No native Date usage
 * is permitted.
 *
 * @param props - Operation context and parameters
 * @param props.administrator - Authenticated administrator payload
 *   (authorization required)
 * @param props.memberId - Target member UUID to fetch notification preferences
 *   for
 * @returns Current IDiscussBoardUserNotificationPreference for the requested
 *   member
 * @throws {Error} If the notification preference is not found (not set or
 *   soft-deleted)
 */
export async function get__discussBoard_administrator_members_$memberId_notificationPreferences(props: {
  administrator: AdministratorPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardUserNotificationPreference> {
  const record =
    await MyGlobal.prisma.discuss_board_user_notification_preferences.findFirst(
      {
        where: {
          member_id: props.memberId,
          deleted_at: null,
        },
        select: {
          id: true,
          member_id: true,
          email_notifications_enabled: true,
          sms_notifications_enabled: true,
          push_notifications_enabled: true,
          newsletter_opt_in: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (!record) throw new Error("Notification preferences not found");
  return {
    id: record.id,
    member_id: record.member_id,
    email_notifications_enabled: record.email_notifications_enabled,
    sms_notifications_enabled: record.sms_notifications_enabled,
    push_notifications_enabled: record.push_notifications_enabled,
    newsletter_opt_in: record.newsletter_opt_in,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
