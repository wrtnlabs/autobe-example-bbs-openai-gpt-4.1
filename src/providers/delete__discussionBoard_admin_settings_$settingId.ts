import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a system/business setting (compliance/audit,
 * discussion_board_settings).
 *
 * This endpoint marks a system configuration setting as deleted (soft
 * deletion), hiding it from normal system usage but retaining the row for audit
 * and compliance. The deleted_at field is updated. Only admins may call this
 * endpoint. It is used as part of configuration lifecycle management and
 * ensures traceability. Not found and permission errors are handled, with
 * related endpoints for listing and undelete. Deletion affects active system
 * configuration upon propagation or cache invalidation.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin performing the deletion
 * @param props.settingId - Unique identifier of the setting to soft delete
 * @returns Void on success
 * @throws {Error} When the setting does not exist or has already been deleted
 *   (soft deleted)
 */
export async function delete__discussionBoard_admin_settings_$settingId(props: {
  admin: AdminPayload;
  settingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, settingId } = props;

  // Step 1: Verify setting exists and is not already deleted
  const setting = await MyGlobal.prisma.discussion_board_settings.findFirst({
    where: {
      id: settingId,
      deleted_at: null,
    },
  });
  if (!setting) {
    throw new Error("Setting not found or already deleted");
  }

  // Step 2: Soft delete (set deleted_at to ISO string now)
  await MyGlobal.prisma.discussion_board_settings.update({
    where: { id: settingId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // No return value; void signifies success
}
