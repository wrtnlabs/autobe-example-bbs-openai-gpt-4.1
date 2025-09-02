import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a password reset event for audit, cleanup, or GDPR compliance.
 *
 * Deletes (soft-delete, by setting deleted_at) a password reset record in the
 * system by its unique ID. Used for cleaning up expired or used tokens, or
 * handling data retention in compliance scenarios. Only token owners or
 * administrators may utilize this operation, with all deletions preserved for
 * audit. Error responses are defined for cases where the resource is not found,
 * already deleted, or when unauthorized access is attempted. Related APIs allow
 * retrieval and update for both audit and recovery support.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated administrator performing the operation
 * @param props.passwordResetId - UUID of the password reset record to delete
 * @returns Void
 * @throws {Error} When no record exists with the given passwordResetId
 */
export async function delete__discussionBoard_admin_passwordResets_$passwordResetId(props: {
  admin: AdminPayload;
  passwordResetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { passwordResetId } = props;

  // Find the password reset record by ID
  const record =
    await MyGlobal.prisma.discussion_board_password_resets.findFirst({
      where: { id: passwordResetId },
    });
  if (!record) {
    throw new Error("Password reset record not found");
  }
  if (record.deleted_at) {
    // Already soft-deleted; idempotent success
    return;
  }

  // Soft delete: set deleted_at = now (in ISO 8601 string format)
  await MyGlobal.prisma.discussion_board_password_resets.update({
    where: { id: passwordResetId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // No return value (void)
}
