import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieve details of notification preference by preferenceId for the current
 * user.
 *
 * Allows an authenticated user to retrieve the full details of a single
 * notification preference configuration. The operation only permits access to
 * preferences owned by the requesting user. Results include active channel
 * selections (in-app, email, push), notification frequency, mute interval, and
 * covered event categories.
 *
 * Strong ownership rules and security checks are enforced to prevent access to
 * another user's preferences. Error responses are returned when the specified
 * record does not exist, has been deleted, or does not belong to the requesting
 * user.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user making the request (must own the
 *   preference)
 * @param props.preferenceId - Unique identifier of the notification preference
 *   record
 * @returns The detailed configuration for the requested notification preference
 * @throws {Error} When the specified record does not exist or is not accessible
 *   by the requesting user
 */
export async function get__discussionBoard_user_notificationPreferences_$preferenceId(props: {
  user: UserPayload;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardNotificationPreference> {
  const record =
    await MyGlobal.prisma.discussion_board_notification_preferences.findFirst({
      where: {
        id: props.preferenceId,
        user_id: props.user.id,
      },
      select: {
        id: true,
        user_id: true,
        email_enabled: true,
        push_enabled: true,
        in_app_enabled: true,
        frequency: true,
        categories: true,
        mute_until: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!record) {
    throw new Error("Notification preference not found or not accessible");
  }
  return {
    id: record.id,
    user_id: record.user_id,
    email_enabled: record.email_enabled,
    push_enabled: record.push_enabled,
    in_app_enabled: record.in_app_enabled,
    frequency: record.frequency,
    categories: record.categories,
    mute_until: record.mute_until ? toISOStringSafe(record.mute_until) : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
