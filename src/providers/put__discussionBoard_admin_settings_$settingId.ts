import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing system/business setting (discussion_board_settings row).
 *
 * This API updates the value, description, or metadata of a specific
 * configuration setting by id. Only admins may call this endpoint, and changes
 * are reflected in the returned setting object. Business logic applies
 * validation on updated values, system-flag rules, and audit logging. Primary
 * key id is immutable. Use related endpoints for listing or deleting settings.
 * Error scenarios include duplicate keys, missing ids, or validation rule
 * breaches.
 *
 * @param props - Request properties for updating a discussion board setting
 * @param props.admin - The authenticated admin user performing the update
 * @param props.settingId - Unique identifier of the system setting to update
 * @param props.body - Fields and new values to update (value, description,
 *   is_system)
 * @returns The updated system/business setting metadata
 * @throws {Error} When the setting does not exist or is soft-deleted
 */
export async function put__discussionBoard_admin_settings_$settingId(props: {
  admin: AdminPayload;
  settingId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSetting.IUpdate;
}): Promise<IDiscussionBoardSetting> {
  const { settingId, body } = props;

  // Fetch setting record by id, must not be soft-deleted
  const setting = await MyGlobal.prisma.discussion_board_settings.findFirst({
    where: { id: settingId, deleted_at: null },
  });
  if (!setting) {
    throw new Error("Setting not found");
  }

  // Only update allowable fields (value, description, is_system); never key or id
  const updated = await MyGlobal.prisma.discussion_board_settings.update({
    where: { id: settingId },
    data: {
      value: body.value ?? undefined,
      description: body.description ?? undefined,
      is_system: body.is_system ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description: updated.description ?? null,
    is_system: updated.is_system,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
