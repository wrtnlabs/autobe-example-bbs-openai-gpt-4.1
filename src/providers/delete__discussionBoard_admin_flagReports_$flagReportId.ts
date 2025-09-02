import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft deletes (retires) a content flag report by marking deleted_at, retaining
 * it for compliance/audit
 *
 * This operation sets the deleted_at and updated_at fields to the current
 * timestamp for the specified flag report. Only administrators or moderators
 * can perform this operation; ensures audit trail is preserved and the report
 * is excluded from routine moderation review. Does NOT perform hard deletion.
 *
 * @param props - Function props
 * @param props.admin - Authenticated admin context (authorization enforced by
 *   decorator)
 * @param props.flagReportId - Unique identifier (UUID) of the flag report to
 *   soft delete
 * @returns Void
 * @throws {Error} If the flag report does not exist or has already been soft
 *   deleted
 */
export async function delete__discussionBoard_admin_flagReports_$flagReportId(props: {
  admin: AdminPayload;
  flagReportId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the flag report by primary key and not already soft deleted
  const flagReport =
    await MyGlobal.prisma.discussion_board_flag_reports.findFirst({
      where: {
        id: props.flagReportId,
        deleted_at: null,
      },
    });
  if (!flagReport) {
    throw new Error("Flag report not found or already deleted");
  }
  // 2. Soft delete by updating deleted_at and updated_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_flag_reports.update({
    where: { id: props.flagReportId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // 3. No return value (void)
}
