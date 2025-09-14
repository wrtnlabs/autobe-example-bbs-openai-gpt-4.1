import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardContentReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieve a specific content report by ID (discuss_board_content_reports
 * table).
 *
 * Fetches full content report details, including reporter, reported content
 * (post or comment), reason, workflow status, and any moderation/appeal
 * linkage. Only the reporting member, moderator, or administrator may view
 * individual reports, as enforced by the authorization system, ensuring privacy
 * and investigation integrity.
 *
 * @param props - Request parameters and authenticated moderator role
 * @param props.moderator - ModeratorPayload, authorization for moderator role
 *   (already validated)
 * @param props.contentReportId - The UUID of the content report to fetch
 * @returns The complete IDiscussBoardContentReport object for the given report
 *   ID
 * @throws {Error} If the content report does not exist for the specified ID
 */
export async function get__discussBoard_moderator_contentReports_$contentReportId(props: {
  moderator: ModeratorPayload;
  contentReportId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardContentReport> {
  const { moderator, contentReportId } = props;
  const report = await MyGlobal.prisma.discuss_board_content_reports.findUnique(
    {
      where: { id: contentReportId },
    },
  );
  if (!report) {
    throw new Error("Content report not found");
  }
  return {
    id: report.id,
    reporter_member_id: report.reporter_member_id,
    content_post_id: report.content_post_id ?? undefined,
    content_comment_id: report.content_comment_id ?? undefined,
    content_type: report.content_type === "post" ? "post" : "comment",
    reason: report.reason,
    status: report.status,
    moderation_action_id: report.moderation_action_id ?? undefined,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at
      ? toISOStringSafe(report.deleted_at)
      : undefined,
  };
}
