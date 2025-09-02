import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a single content flag report by its unique ID for internal admin
 * review.
 *
 * Returns full flag report details including reporting user, post/comment
 * context, reason, status, review metadata, and all timestamps. Only accessible
 * to authorized admins.
 *
 * @param props - The request props.
 * @param props.admin - The authenticated AdminPayload (enforces admin access
 *   control)
 * @param props.flagReportId - The unique ID of the flag report to retrieve
 * @returns The detailed flag report record for the requested ID
 * @throws {Error} If the report does not exist or has been deleted
 */
export async function get__discussionBoard_admin_flagReports_$flagReportId(props: {
  admin: AdminPayload;
  flagReportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardFlagReport> {
  const { flagReportId } = props;

  const report = await MyGlobal.prisma.discussion_board_flag_reports.findFirst({
    where: {
      id: flagReportId,
      deleted_at: null,
    },
  });
  if (!report) throw new Error("Flag report not found");

  return {
    id: report.id,
    reporterId: report.reporter_id,
    postId: report.post_id ?? undefined,
    commentId: report.comment_id ?? undefined,
    reason: report.reason,
    details: report.details ?? undefined,
    status: report.status,
    reviewedAt: report.reviewed_at
      ? toISOStringSafe(report.reviewed_at)
      : undefined,
    createdAt: toISOStringSafe(report.created_at),
    updatedAt: toISOStringSafe(report.updated_at),
  };
}
