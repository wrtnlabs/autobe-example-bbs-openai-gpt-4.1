import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Soft delete a content flag report by marking it as deleted (retained for
 * compliance).
 *
 * Operates by setting the `deleted_at` field of the specified flag report to
 * the current timestamp, preserving the record for future audit, compliance,
 * and moderation review. Only moderators can execute this operation.
 *
 * @param props - Request properties
 * @param props.moderator - Authenticated moderator context; enforces role-based
 *   access.
 * @param props.flagReportId - Unique identifier of the flag report to delete
 *   (soft delete).
 * @returns Void
 * @throws {Error} When flag report does not exist
 * @throws {Error} When flag report is already soft deleted
 */
export async function delete__discussionBoard_moderator_flagReports_$flagReportId(props: {
  moderator: ModeratorPayload;
  flagReportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, flagReportId } = props;

  // Fetch flag report by ID to validate existence and not deleted
  const flagReport =
    await MyGlobal.prisma.discussion_board_flag_reports.findUnique({
      where: { id: flagReportId },
    });
  if (!flagReport) {
    throw new Error("Flag report not found");
  }
  if (flagReport.deleted_at) {
    throw new Error("Flag report already deleted");
  }

  // Set deleted_at to current timestamp, soft delete (immutable pattern)
  await MyGlobal.prisma.discussion_board_flag_reports.update({
    where: { id: flagReportId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
