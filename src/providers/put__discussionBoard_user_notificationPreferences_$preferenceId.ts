import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Update the configuration of a notification preference record by preferenceId.
 *
 * Allows users to update their notification preferences record by identifier,
 * including changing delivery settings (enabling/disabling email, push, or
 * in-app), updating the frequency (immediate, batch/digest), categories, or
 * mute-until settings. Works with the discussion_board_notification_preferences
 * table, with each record belonging to only one user. Strict access control
 * ensures only the owner may update their preferences.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user requesting the update (must own
 *   the preference)
 * @param props.preferenceId - UUID of the notification preference to update
 * @param props.body - Partial notification preference update fields (channel
 *   toggles, frequency, categories, or mute interval)
 * @returns The updated notification preference record with all fields
 * @throws {Error} If the record does not exist or the user is not the owner
 */
export async function put__discussionBoard_user_notificationPreferences_$preferenceId(props: {
  user: UserPayload;
  preferenceId: string & tags.Format<"uuid">;
  body: IDiscussionBoardNotificationPreference.IUpdate;
}): Promise<IDiscussionBoardNotificationPreference> {
  const { user, preferenceId, body } = props;

  // Fetch the current preference record
  const preference =
    await MyGlobal.prisma.discussion_board_notification_preferences.findUnique({
      where: { id: preferenceId },
    });
  if (!preference) throw new Error("Notification preference not found");

  // Enforce strict owner check
  if (preference.user_id !== user.id)
    throw new Error(
      "Forbidden: Only the owner may update this notification preference",
    );

  // Update with provided fields only; skip undefined
  const updated =
    await MyGlobal.prisma.discussion_board_notification_preferences.update({
      where: { id: preferenceId },
      data: {
        email_enabled: body.email_enabled ?? undefined,
        push_enabled: body.push_enabled ?? undefined,
        in_app_enabled: body.in_app_enabled ?? undefined,
        frequency: body.frequency ?? undefined,
        categories: body.categories ?? undefined,
        mute_until:
          body.mute_until === null ? null : (body.mute_until ?? undefined),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    user_id: updated.user_id,
    email_enabled: updated.email_enabled,
    push_enabled: updated.push_enabled,
    in_app_enabled: updated.in_app_enabled,
    frequency: updated.frequency,
    categories: updated.categories,
    mute_until: updated.mute_until ? toISOStringSafe(updated.mute_until) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
