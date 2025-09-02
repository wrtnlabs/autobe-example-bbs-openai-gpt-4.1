import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates the status, review timestamp, or moderator notes for an existing
 * content flag report.
 *
 * This API is for use by admins (and moderators, if delegated) to process
 * moderation queue items (flag reports). You can change review status (e.g.
 * triaged, accepted, dismissed, escalated), updated moderation notes, and set
 * or adjust reviewedAt timestamp. All updates are auditable. Only fields
 * allowed by policy (status, reviewedAt, details) may be updated; identity and
 * reporter fields never change.
 *
 * Authorization: Actor must be an authenticated admin. Soft-deleted or missing
 * reports yield errors.
 *
 * @param props - Request properties
 * @param props.admin - Admin authentication payload (must be a valid, active
 *   admin)
 * @param props.flagReportId - The UUID of the flag report to update
 * @param props.body - Update fields (only status, reviewedAt, details allowed)
 * @returns The updated flag report with all current details
 * @throws {Error} When the flag report does not exist or has been deleted
 */
export async function put__discussionBoard_admin_flagReports_$flagReportId(props: {
  admin: AdminPayload;
  flagReportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardFlagReport.IUpdate;
}): Promise<IDiscussionBoardFlagReport> {
  const { admin, flagReportId, body } = props;
  // Fetch the flag report (must not be soft-deleted)
  const report = await MyGlobal.prisma.discussion_board_flag_reports.findFirst({
    where: {
      id: flagReportId,
      deleted_at: null,
    },
  });
  if (!report) {
    throw new Error("Flag report not found");
  }

  // Prepare update fields (only status, reviewed_at, details, updated_at)
  // Dates: always use toISOStringSafe, check null/undefined
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_flag_reports.update({
    where: { id: flagReportId },
    data: {
      status: body.status ?? undefined,
      reviewed_at: body.reviewedAt ?? undefined,
      details: body.details ?? undefined,
      updated_at: now,
    },
  });

  // Map output to IDiscussionBoardFlagReport (properly brand/cast all fields; dates are always converted)
  return {
    id: updated.id,
    reporterId: updated.reporter_id,
    postId: updated.post_id ?? undefined,
    commentId: updated.comment_id ?? undefined,
    reason: updated.reason,
    details: updated.details ?? undefined,
    status: updated.status,
    reviewedAt: updated.reviewed_at
      ? toISOStringSafe(updated.reviewed_at)
      : undefined,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
  };
}
