import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Permanently removes (soft-deletes) a member account from the system.
 *
 * This operation enables an administrator to soft-delete a member account
 * identified by its unique memberId in the discuss_board_members table. It sets
 * the member's deleted_at field to the current timestamp for audit and
 * retention purposes, while also updating updated_at for compliance. Only
 * administrators may invoke this action. If the member does not exist, an error
 * is thrown. There are no side effects on related content in this operation.
 *
 * @param props - The properties required for soft-deleting a member
 * @param props.administrator - The authenticated administrator payload
 *   (authorization enforced upstream)
 * @param props.memberId - The unique identifier (UUID) of the member to be
 *   deleted
 * @returns Void
 * @throws {Error} If the member does not exist or database error occurs
 */
export async function delete__discussBoard_administrator_members_$memberId(props: {
  administrator: AdministratorPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the member exists before attempting soft delete
  await MyGlobal.prisma.discuss_board_members.findUniqueOrThrow({
    where: { id: props.memberId },
  });

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  await MyGlobal.prisma.discuss_board_members.update({
    where: { id: props.memberId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // No value returned for compliance with void contract
}
