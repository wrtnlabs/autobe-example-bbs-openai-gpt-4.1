import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardContentReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update a content report (discuss_board_content_reports table) by ID.
 *
 * This function allows a moderator to update the status, resolution reason, or
 * link a moderation_action_id to an individual content report during the
 * moderation workflow. Only fields status, reason, and moderation_action_id are
 * updatable. The operation sets updated_at to the current timestamp. The entire
 * updated report is returned with audit-safe formatting. Throws if the report
 * does not exist.
 *
 * Authentication: Requires authenticated moderator (ModeratorPayload)
 *
 * @param props - Request parameter object
 * @param props.moderator - The authenticated moderator making the request
 * @param props.contentReportId - The UUID of the content report to update
 * @param props.body - Update fields: status, reason, moderation_action_id (as
 *   per business logic)
 * @returns The updated IDiscussBoardContentReport object
 * @throws Error if the report does not exist
 */
export async function put__discussBoard_moderator_contentReports_$contentReportId(props: {
  moderator: ModeratorPayload;
  contentReportId: string & tags.Format<"uuid">;
  body: IDiscussBoardContentReport.IUpdate;
}): Promise<IDiscussBoardContentReport> {
  const { contentReportId, body } = props;

  // Step 1: Fetch existing report (throws if not found)
  const existing =
    await MyGlobal.prisma.discuss_board_content_reports.findUnique({
      where: { id: contentReportId },
    });
  if (!existing) throw new Error("Content report not found");

  // Step 2: Update only allowed fields (status, reason, moderation_action_id, updated_at)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discuss_board_content_reports.update({
    where: { id: contentReportId },
    data: {
      status: body.status ?? undefined,
      reason: body.reason ?? undefined,
      moderation_action_id: body.moderation_action_id ?? undefined,
      updated_at: now,
    },
  });

  // Step 3: Return full updated record (properly convert all date fields, and cast content_type)
  return {
    id: updated.id,
    reporter_member_id: updated.reporter_member_id,
    content_post_id: updated.content_post_id,
    content_comment_id: updated.content_comment_id,
    content_type: updated.content_type as "post" | "comment",
    reason: updated.reason,
    status: updated.status,
    moderation_action_id: updated.moderation_action_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
