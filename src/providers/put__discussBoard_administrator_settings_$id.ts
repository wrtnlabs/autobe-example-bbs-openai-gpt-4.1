import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardSettings";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update an existing discussBoard system settings record
 * (discuss_board_settings table)
 *
 * Overwrites and updates the discussBoard platform's global system
 * configuration settings. Only privileged administrators may perform this
 * action. This operation fully replaces the config_json value for the specified
 * record by UUID, updates the updated_at timestamp to the current ISO 8601 UTC,
 * and returns the complete settings object. Audit logging of this configuration
 * change should be handled externally.
 *
 * @param props - Properties for the update operation
 * @param props.administrator - Authenticated administrator credentials. Only
 *   admins may update system settings.
 * @param props.id - UUID of the settings record to update.
 * @param props.body - Contains the new config_json string to apply.
 * @returns The updated IDiscussBoardSettings record.
 * @throws {Error} If the settings record with the given id does not exist.
 */
export async function put__discussBoard_administrator_settings_$id(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussBoardSettings.IUpdate;
}): Promise<IDiscussBoardSettings> {
  const { administrator, id, body } = props;

  // 1. Ensure record exists before update
  const settings = await MyGlobal.prisma.discuss_board_settings.findUnique({
    where: { id },
  });
  if (!settings) throw new Error("Settings record not found");

  // 2. Perform update (replace config_json, set updated_at to now)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discuss_board_settings.update({
    where: { id },
    data: {
      config_json: body.config_json,
      updated_at: now,
    },
  });

  // 3. Return the full updated settings object
  return {
    id: updated.id,
    config_json: updated.config_json,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
