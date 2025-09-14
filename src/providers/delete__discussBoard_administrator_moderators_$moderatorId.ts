import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Soft-delete (revoke) a moderator role by moderatorId in
 * discuss_board_moderators.
 *
 * This operation allows an authenticated administrator to revoke (soft-delete)
 * a moderator's privileges by setting the deleted_at timestamp in the
 * discuss_board_moderators table. This supports business requirements for
 * auditability, workflow transparency, and regulatory compliance by never
 * physically deleting moderator records. Only a valid administrator (from
 * props.administrator) can perform this operation. If the moderator is not
 * found, or has already been deleted, an error is thrown. The function is
 * strictly immutable, performs full date conversion using toISOStringSafe, and
 * never uses native Date types in declarations. All operations are performed in
 * line with verified schema fields.
 *
 * @param props - Request properties
 * @param props.administrator - Authenticated administrator payload
 *   (role-checked by decorator)
 * @param props.moderatorId - Unique identifier of the moderator to be
 *   soft-deleted (UUID)
 * @returns Void
 * @throws {Error} If moderator record not found or already soft-deleted
 */
export async function delete__discussBoard_administrator_moderators_$moderatorId(props: {
  administrator: AdministratorPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderatorId } = props;
  // Step 1: Ensure target moderator exists and is not already soft-deleted
  const moderator = await MyGlobal.prisma.discuss_board_moderators.findFirst({
    where: { id: moderatorId, deleted_at: null },
  });
  if (!moderator) {
    throw new Error("Moderator not found or already deleted.");
  }
  // Step 2: Set deleted_at field for soft-delete (ISO date-time string compliance)
  await MyGlobal.prisma.discuss_board_moderators.update({
    where: { id: moderatorId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // No return value as per spec
}
