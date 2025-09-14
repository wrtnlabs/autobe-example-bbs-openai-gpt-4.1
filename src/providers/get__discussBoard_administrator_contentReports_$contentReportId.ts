import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardContentReport";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function get__discussBoard_administrator_contentReports_$contentReportId(props: {
  administrator: AdministratorPayload;
  contentReportId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardContentReport> {
  const { contentReportId } = props;
  const report = await MyGlobal.prisma.discuss_board_content_reports.findFirst({
    where: { id: contentReportId, deleted_at: null },
  });
  if (!report) throw new Error("Content report not found");
  return {
    id: report.id,
    reporter_member_id: report.reporter_member_id,
    content_post_id: report.content_post_id ?? undefined,
    content_comment_id: report.content_comment_id ?? undefined,
    content_type: report.content_type as "post" | "comment",
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
