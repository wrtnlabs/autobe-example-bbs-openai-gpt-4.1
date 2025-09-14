import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Soft-delete a content report (discuss_board_content_reports table) by ID.
 *
 * This operation allows a moderator to soft-delete an existing content report
 * by marking its deleted_at field. The content report will remain in the system
 * for audit, workflow, and regulatory compliance, but will no longer be
 * displayed or processed as an active report. Only reports that exist and are
 * not already deleted can be soft-deleted. Moderators are permitted to perform
 * this action on any report as part of moderation workflow.
 *
 * @param props - Operation parameters
 * @param props.moderator - The authenticated moderator performing the operation
 *   (must have valid moderator credentials)
 * @param props.contentReportId - UUID of the content report to soft-delete
 * @returns Void
 * @throws {Error} If the content report does not exist or has already been
 *   deleted
 */
export async function delete__discussBoard_moderator_contentReports_$contentReportId(props: {
  moderator: ModeratorPayload;
  contentReportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { contentReportId } = props;
  // Fetch report
  const report = await MyGlobal.prisma.discuss_board_content_reports.findUnique(
    {
      where: { id: contentReportId },
    },
  );
  if (!report) throw new Error("Content report not found");
  if (report.deleted_at !== null)
    throw new Error("Content report has already been deleted");
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discuss_board_content_reports.update({
    where: { id: contentReportId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
