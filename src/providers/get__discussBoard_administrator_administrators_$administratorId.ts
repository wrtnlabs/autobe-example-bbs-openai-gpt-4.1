import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve a single administrator account detail by administratorId from
 * discuss_board_administrators.
 *
 * This endpoint returns detailed information for the specified administrator
 * account. It enforces strict access control such that only the authenticated
 * administrator may query their own detail. The response includes all business
 * and audit-relevant fields, with all DateTime fields returned as properly
 * formatted ISO 8601 strings. If the record is not found or access is denied,
 * an error is thrown.
 *
 * @param props - Input properties
 * @param props.administrator - The authenticated administrator making the
 *   request
 * @param props.administratorId - The unique UUID of the administrator record to
 *   retrieve
 * @returns The full administrator record as an IDiscussBoardAdministrator
 *   object
 * @throws {Error} If record does not exist, is soft-deleted, or access is
 *   denied
 */
export async function get__discussBoard_administrator_administrators_$administratorId(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardAdministrator> {
  const { administrator, administratorId } = props;

  const admin = await MyGlobal.prisma.discuss_board_administrators.findFirst({
    where: {
      id: administratorId,
      deleted_at: null,
    },
    select: {
      id: true,
      member_id: true,
      escalated_by_administrator_id: true,
      escalated_at: true,
      revoked_at: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!admin) throw new Error("Administrator not found");

  // Enforce RBAC: administrator can only access their own record
  // Resolves the member chain:
  // Current administrator's id in JWT payload is user_account_id
  // Must match what the admin record's member points to
  const member = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      id: admin.member_id,
      deleted_at: null,
      status: "active",
      user_account_id: administrator.id,
    },
  });

  if (!member) {
    throw new Error("Forbidden: Access denied to administrator details");
  }

  return {
    id: admin.id,
    member_id: admin.member_id,
    escalated_by_administrator_id: admin.escalated_by_administrator_id,
    escalated_at: toISOStringSafe(admin.escalated_at),
    revoked_at: admin.revoked_at
      ? toISOStringSafe(admin.revoked_at)
      : undefined,
    status: admin.status,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at
      ? toISOStringSafe(admin.deleted_at)
      : undefined,
  } satisfies IDiscussBoardAdministrator;
}
