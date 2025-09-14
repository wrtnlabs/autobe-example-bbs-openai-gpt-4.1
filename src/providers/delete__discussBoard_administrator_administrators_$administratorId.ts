import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Revoke (soft-delete) administrator account and privileges in
 * discuss_board_administrators by administratorId.
 *
 * This operation soft-deletes (revokes privileges of) an administrator account
 * by marking the record's deleted_at field with the current timestamp. Business
 * logic prevents revocation if only one active administrator remains, ensuring
 * platform continuity. The target admin is located by administratorId and must
 * not already be revoked. No records are physically removed.
 *
 * @param props - Request properties
 * @param props.administrator - Authenticated administrator performing the
 *   revoke action
 * @param props.administratorId - Unique identifier for the administrator to
 *   revoke
 * @returns Void
 * @throws {Error} If the administrator does not exist or has already been
 *   revoked
 * @throws {Error} If attempting to revoke the final remaining active
 *   administrator
 */
export async function delete__discussBoard_administrator_administrators_$administratorId(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, administratorId } = props;
  // Find the target admin (must not already be revoked)
  const admin = await MyGlobal.prisma.discuss_board_administrators.findFirst({
    where: { id: administratorId, deleted_at: null },
  });
  if (!admin) {
    throw new Error("Administrator not found or already revoked");
  }
  // Count all active admins before soft-delete
  const activeAdminCount =
    await MyGlobal.prisma.discuss_board_administrators.count({
      where: { deleted_at: null },
    });
  if (activeAdminCount <= 1) {
    throw new Error("Cannot remove the final remaining administrator");
  }
  // Soft-delete (revoke privileges)
  await MyGlobal.prisma.discuss_board_administrators.update({
    where: { id: administratorId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
