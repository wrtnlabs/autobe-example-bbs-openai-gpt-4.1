import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Delete a notification preference configuration by its identifier for the
 * authenticated user.
 *
 * Enables authenticated users to delete (hard-delete) their notification
 * preference configuration. This operation is irreversible and results in the
 * removal of the preferences from the data store. Ownership checks ensure that
 * only the requesting user may delete their own preference record. After
 * deletion, system or default notification settings apply for the affected
 * notification categories or channels.
 *
 * Related operations include listing preferences, viewing by ID, and updating
 * (PUT). Deletion attempts for non-existent or non-owned preferences are denied
 * with explicit business error responses. Once deleted, preference
 * configurations cannot be restored.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user requesting deletion (must be owner
 *   of the preference)
 * @param props.preferenceId - The UUID of the notification preference to delete
 * @returns Void
 * @throws {Error} When preference is not found
 * @throws {Error} When user does not own the preference (forbidden)
 */
export async function delete__discussionBoard_user_notificationPreferences_$preferenceId(props: {
  user: UserPayload;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, preferenceId } = props;
  const preference =
    await MyGlobal.prisma.discussion_board_notification_preferences.findUnique({
      where: { id: preferenceId },
    });
  if (!preference) {
    throw new Error("Notification preference not found");
  }
  if (preference.user_id !== user.id) {
    throw new Error(
      "Forbidden: Cannot delete notification preferences for other users",
    );
  }
  await MyGlobal.prisma.discussion_board_notification_preferences.delete({
    where: { id: preferenceId },
  });
}
