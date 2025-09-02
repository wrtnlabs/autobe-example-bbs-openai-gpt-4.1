import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft-delete an export log entry for compliance lifecycle management.
 *
 * Soft-deletes the export log identified by exportLogId, marking it as deleted
 * for compliance retention (sets 'deleted_at' column). The record persists for
 * audit and incident review, but is omitted from standard queries.
 *
 * Authorization: Only authenticated admins may perform this operation. The
 * system ensures the provided admin payload is active, not deleted or
 * suspended. Deletion actions are typically logged for compliance traceability
 * elsewhere.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the deletion
 *   (authorization enforced upstream)
 * @param props.exportLogId - Unique identifier of the export log record to
 *   delete (UUID)
 * @returns Void
 * @throws {Error} If the export log record is not found
 */
export async function delete__discussionBoard_admin_exportLogs_$exportLogId(props: {
  admin: AdminPayload;
  exportLogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Validate export log existence
  const log = await MyGlobal.prisma.discussion_board_export_logs.findFirst({
    where: { id: props.exportLogId },
  });
  if (!log) {
    throw new Error("Export log not found");
  }

  // Step 2: Soft-delete by setting deleted_at (preserve for compliance)
  await MyGlobal.prisma.discussion_board_export_logs.update({
    where: { id: props.exportLogId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
