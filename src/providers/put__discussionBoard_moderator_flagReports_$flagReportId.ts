import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update an existing content flag report to reflect review or status changes.
 *
 * Update an existing content flag report as part of the moderation workflow.
 * Moderators and admins may change the status (such as from 'pending' to
 * 'triaged', 'accepted', 'dismissed', or 'escalated'), set reviewed timestamps,
 * or update moderator notes based on the investigation outcome.
 *
 * Immutable fields such as reporter, post, comment, and original submission
 * data remain unchanged. The operation enforces audit trails by updating the
 * updated_at field and may append moderator comments as permitted by schema and
 * business rules. Fields subject to update must reflect business process
 * constraints and ensure accuracy for compliance review.
 *
 * Permission checks require the actor to have moderator or admin status. The
 * API response includes the updated flag report entity for further workflow
 * integration, such as status display or audit export.
 *
 * @param props - Moderator: ModeratorPayload (injected by decorator, verifies
 *   the moderator role) flagReportId: Unique identifier of the flag report to
 *   update (string & tags.Format<'uuid'>) body:
 *   IDiscussionBoardFlagReport.IUpdate - Fields to update, such as status
 *   (string), reviewedAt (ISO date), details (string)
 * @returns IDiscussionBoardFlagReport - The updated flag report as per the API
 *   schema, all date fields as ISO strings.
 * @throws Error When the flag report doesn't exist or has been deleted.
 */
export async function put__discussionBoard_moderator_flagReports_$flagReportId(props: {
  moderator: ModeratorPayload;
  flagReportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardFlagReport.IUpdate;
}): Promise<IDiscussionBoardFlagReport> {
  const { flagReportId, body } = props;

  // Find the flag report to ensure it exists and is not deleted.
  const existing =
    await MyGlobal.prisma.discussion_board_flag_reports.findFirst({
      where: {
        id: flagReportId,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new Error("Flag report not found");
  }

  // Always update updated_at and only change allowed fields.
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_flag_reports.update({
    where: { id: flagReportId },
    data: {
      status: body.status ?? undefined,
      reviewed_at: body.reviewedAt
        ? toISOStringSafe(body.reviewedAt)
        : undefined,
      details: body.details ?? undefined,
      updated_at: now,
    },
  });

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
