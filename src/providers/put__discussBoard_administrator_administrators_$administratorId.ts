import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update administrator account properties in discuss_board_administrators by
 * administratorId.
 *
 * Updates the properties of an existing administrator account record in the
 * discuss_board_administrators table, identified by administratorId. Only
 * fields permitted for update by business logic—such as status, revoked_at,
 * updated_at, and deleted_at—are modified.
 *
 * Only authenticated administrators may invoke this operation, and business
 * rules are enforced: updates are blocked for revoked or deleted admins,
 * demotion is blocked for the last active administrator, and all date/datetime
 * values are handled strictly as string & tags.Format<'date-time'> values (no
 * native Date objects).
 *
 * @param props - The update request parameters.
 * @param props.administrator - Actor administrator making the request
 *   (authorization enforced).
 * @param props.administratorId - Target administratorId to update.
 * @param props.body - Partial update specification (status, revoked_at,
 *   updated_at, deleted_at).
 * @returns The fully updated administrator DTO entity, with all date fields
 *   normalized as strings.
 * @throws {Error} When the target administrator is not found, is
 *   revoked/deleted, or update would violate business rules (e.g., demoting the
 *   last active admin).
 */
export async function put__discussBoard_administrator_administrators_$administratorId(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  body: IDiscussBoardAdministrator.IUpdate;
}): Promise<IDiscussBoardAdministrator> {
  const { administrator, administratorId, body } = props;
  // Step 1: Find the administrator to update and ensure not deleted/revoked
  const admin = await MyGlobal.prisma.discuss_board_administrators.findFirst({
    where: {
      id: administratorId,
      deleted_at: null,
    },
  });
  if (!admin) throw new Error("Administrator not found or already deleted");
  if (admin.revoked_at !== null && admin.revoked_at !== undefined) {
    throw new Error("Cannot update revoked administrator");
  }
  // Step 2: Prevent demotion if this is the last active admin
  if (
    body.status !== undefined &&
    body.status !== null &&
    body.status !== "active"
  ) {
    const remainingActive =
      await MyGlobal.prisma.discuss_board_administrators.count({
        where: {
          id: { not: administratorId },
          deleted_at: null,
          revoked_at: null,
          status: "active",
        },
      });
    if (remainingActive === 0) {
      throw new Error(
        "Cannot demote the only remaining active administrator; at least one active admin required.",
      );
    }
  }
  // Step 3: Update the allowed fields atomically
  const updated = await MyGlobal.prisma.discuss_board_administrators.update({
    where: { id: administratorId },
    data: {
      status: body.status ?? undefined,
      revoked_at: body.revoked_at !== undefined ? body.revoked_at : undefined,
      updated_at: body.updated_at !== undefined ? body.updated_at : undefined,
      deleted_at: body.deleted_at !== undefined ? body.deleted_at : undefined,
    },
  });
  // Step 4: Normalize all date fields before returning
  return {
    id: updated.id,
    member_id: updated.member_id,
    escalated_by_administrator_id: updated.escalated_by_administrator_id,
    escalated_at: toISOStringSafe(updated.escalated_at),
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
