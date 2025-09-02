import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieves the details of a single content flag report specified by its unique
 * ID.
 *
 * Allows authorized moderators to access all metadata for review, moderation,
 * or audit. Only non-deleted reports are accessible.
 *
 * @param props - Moderator authentication and report ID
 * @param props.moderator - Moderator payload (authorization handled by
 *   decorator/provider)
 * @param props.flagReportId - Unique identifier for the flag report to retrieve
 * @returns IDiscussionBoardFlagReport with complete status, content references,
 *   and timestamps
 * @throws {Error} If no such flag report exists or has been deleted (soft- or
 *   hard-deleted)
 */
export async function get__discussionBoard_moderator_flagReports_$flagReportId(props: {
  moderator: ModeratorPayload;
  flagReportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardFlagReport> {
  const { flagReportId } = props;

  // Query the flag report by primary key and ensure not deleted
  const report = await MyGlobal.prisma.discussion_board_flag_reports.findFirst({
    where: {
      id: flagReportId,
      deleted_at: null,
    },
  });

  if (!report) {
    throw new Error("Flag report not found");
  }

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
