import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardUserNotificationPreference";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update notification settings for a member account
 * (discuss_board_user_notification_preferences table).
 *
 * Applies changes to a member's notification delivery preferences, taking new
 * configuration from the request body and applying them to the specified member
 * by memberId. Only the member themself may alter these settings through this
 * endpoint (administrators not supported in this context), and all updates are
 * immediate and tracked.
 *
 * @param props - Request properties including authenticated member, memberId of
 *   target, and update body
 * @param props.member - The authenticated member performing the update (must
 *   match memberId to authorize)
 * @param props.memberId - The UUID of the member whose preferences are being
 *   updated
 * @param props.body - The updated notification preference settings
 * @returns The updated notification preference record for the member, with all
 *   fields populated
 * @throws {Error} When the requester is not authorized, the member is not
 *   found, or other failure occurs
 */
export async function put__discussBoard_member_members_$memberId_notificationPreferences(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IDiscussBoardUserNotificationPreference.IUpdate;
}): Promise<IDiscussBoardUserNotificationPreference> {
  const { member, memberId, body } = props;

  // Only allow self-ownership updates (no admin elevation in this endpoint)
  if (member.id !== memberId) {
    throw new Error(
      "Unauthorized: members may only update their own notification preferences",
    );
  }

  // Check that the member exists, is active, and not deleted
  const memberRecord = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      id: memberId,
      status: "active",
      deleted_at: null,
    },
  });
  if (!memberRecord) {
    throw new Error("Member not found or is inactive/deleted");
  }

  // Update only supplied fields, always set updated_at to now
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.discuss_board_user_notification_preferences.update({
      where: { member_id: memberId },
      data: {
        email_notifications_enabled:
          body.email_notifications_enabled ?? undefined,
        sms_notifications_enabled: body.sms_notifications_enabled ?? undefined,
        push_notifications_enabled:
          body.push_notifications_enabled ?? undefined,
        newsletter_opt_in: body.newsletter_opt_in ?? undefined,
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
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
