import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update moderator account fields including status and revocation
 * (discuss_board_moderators table).
 *
 * Enables administrators to alter an existing moderator account by updating
 * core fields including status, revocation timestamp, or other relevant fields.
 * This is a PATCH-like operation updating only allowed mutable fields. All
 * changes are fully audited via returned record; only administrators can
 * perform this action. Date fields are always handled as string &
 * tags.Format<'date-time'>.
 *
 * @param props - Properties for update operation
 * @param props.administrator - Authenticated administrator payload
 *   (authorization required)
 * @param props.moderatorId - UUID of moderator account to update
 * @param props.body - New values for updatable fields (status, revoked_at,
 *   updated_at, deleted_at)
 * @returns Full updated moderator record (all fields, all date types as string
 *   & tags.Format<'date-time'>)
 * @throws {Error} If no such moderator exists or other operation failure
 */
export async function put__discussBoard_administrator_moderators_$moderatorId(props: {
  administrator: AdministratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IDiscussBoardModerator.IUpdate;
}): Promise<IDiscussBoardModerator> {
  const { moderatorId, body } = props;

  // 1. Ensure target moderator exists
  const moderator =
    await MyGlobal.prisma.discuss_board_moderators.findUniqueOrThrow({
      where: { id: moderatorId },
    });

  // 2. Prepare updatable fields according to schema and DTOs
  const now = toISOStringSafe(new Date());
  const updateFields = {
    // Only assign if explicitly present in body (including null for nullable fields)
    revoked_at:
      body.revoked_at !== undefined
        ? body.revoked_at === null
          ? null
          : toISOStringSafe(body.revoked_at)
        : undefined,
    status: body.status !== undefined ? body.status : undefined,
    deleted_at:
      body.deleted_at !== undefined
        ? body.deleted_at === null
          ? null
          : toISOStringSafe(body.deleted_at)
        : undefined,
    updated_at:
      body.updated_at !== undefined ? toISOStringSafe(body.updated_at) : now,
  };

  // 3. Update moderator in DB (PATCH semantics: only present fields change)
  await MyGlobal.prisma.discuss_board_moderators.update({
    where: { id: moderatorId },
    data: updateFields,
  });

  // 4. Reload updated record
  const updated =
    await MyGlobal.prisma.discuss_board_moderators.findUniqueOrThrow({
      where: { id: moderatorId },
    });

  // 5. Return full record—all date fields converted to string & tags.Format<'date-time'>, null as-is.
  return {
    id: updated.id,
    member_id: updated.member_id,
    assigned_by_administrator_id: updated.assigned_by_administrator_id,
    assigned_at: toISOStringSafe(updated.assigned_at),
    revoked_at:
      updated.revoked_at !== null && updated.revoked_at !== undefined
        ? toISOStringSafe(updated.revoked_at)
        : null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
