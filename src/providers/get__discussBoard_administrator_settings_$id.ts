import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardSettings";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Get detail of a discussBoard platform setting (discuss_board_settings table)
 *
 * Retrieves full details for a specific discussBoard global system
 * configuration, identified by its unique UUID as the primary key in the
 * discuss_board_settings table.
 *
 * Administrators may use this endpoint for audit, system diagnosis, or review
 * of changes to platform-wide settings. As system settings are sensitive, this
 * operation strictly enforces administrator access control.
 *
 * Throws an error if the settings record does not exist, or if the
 * administrator payload is missing/invalid.
 *
 * @param props - Object containing all necessary parameters
 * @param props.administrator - The authenticated administrator performing the
 *   request
 * @param props.id - UUID of the discussBoard settings record to retrieve
 * @returns The complete discussBoard system configuration record (ID,
 *   config_json, and audit timestamps)
 * @throws {Error} If no settings record exists for the given id
 * @throws {Error} If administrator context is missing or insufficient
 */
export async function get__discussBoard_administrator_settings_$id(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardSettings> {
  const { administrator, id } = props;

  // Authorization: verified via presence and type of props.administrator (enforced by controller/decorator)

  // Fetch the settings record by UUID, selecting only valid schema fields
  const result = await MyGlobal.prisma.discuss_board_settings.findUnique({
    where: { id },
    select: {
      id: true,
      config_json: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!result) {
    throw new Error("Setting not found");
  }

  return {
    id: result.id,
    config_json: result.config_json,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
  };
}
