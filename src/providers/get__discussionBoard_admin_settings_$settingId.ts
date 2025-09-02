import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get details of a discussion_board_settings row by id (setting detail).
 *
 * Fetch detail for a single system or business configuration setting, as stored
 * in the discussion_board_settings table. The endpoint accepts a settingId
 * parameter (UUID), returning all columns, including key, value, and audit
 * metadata. Used by admins to view or review specific settings, often as part
 * of audit, maintenance, or live reconfiguration tasks. Only accessible to
 * admins.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin making the request
 * @param props.settingId - Unique identifier for the system or business setting
 *   (UUID)
 * @returns Details of the requested system or business setting
 * @throws {Error} When no active setting exists for given id (either not found
 *   or soft deleted)
 */
export async function get__discussionBoard_admin_settings_$settingId(props: {
  admin: AdminPayload;
  settingId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSetting> {
  const { admin, settingId } = props;
  // Authorization is enforced by presence and validity of 'admin' param (see controller/decorator)

  // Fetch the setting with given id, only if active (not soft deleted)
  const setting = await MyGlobal.prisma.discussion_board_settings.findFirst({
    where: {
      id: settingId,
      deleted_at: null,
    },
  });
  if (!setting) {
    throw new Error("Setting not found");
  }

  // Return exactly the expected API structure, converting date/datetime fields
  return {
    id: setting.id, // already UUID, enforced by DB
    key: setting.key,
    value: setting.value,
    description: setting.description ?? null,
    is_system: setting.is_system,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
    deleted_at: setting.deleted_at ? toISOStringSafe(setting.deleted_at) : null,
  };
}
