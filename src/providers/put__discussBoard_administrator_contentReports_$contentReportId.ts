import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardContentReport";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Updates a content report record (discuss_board_content_reports) by ID.
 *
 * This operation is used by administrators to change status, add resolution
 * notes, or associate the report with a moderation action. It enforces strict
 * typing, does not use the native Date type, and normalizes all datetime fields
 * to ISO8601 strings with correct tags. Authorization is enforced via
 * AdministratorPayload and access to this function is restricted to valid
 * administrators via authentication decorators.
 *
 * @param props - Object containing all operation parameters
 * @param props.administrator - The authenticated administrator performing the
 *   update
 * @param props.contentReportId - The UUID of the content report to update
 * @param props.body - Update data containing status/reason/moderation_action_id
 * @returns The updated content report compliant with IDiscussBoardContentReport
 * @throws {Error} If the content report does not exist or business logic
 *   prohibits update
 */
export async function put__discussBoard_administrator_contentReports_$contentReportId(props: {
  administrator: AdministratorPayload;
  contentReportId: string & tags.Format<"uuid">;
  body: IDiscussBoardContentReport.IUpdate;
}): Promise<IDiscussBoardContentReport> {
  const { contentReportId, body } = props;
  // Step 1: Ensure the content report exists; throw if not found
  const found =
    await MyGlobal.prisma.discuss_board_content_reports.findUniqueOrThrow({
      where: { id: contentReportId },
    });
  // Step 2: Prepare update fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Step 3: Execute update (conditionally set each updateable field; always update updated_at)
  const updated = await MyGlobal.prisma.discuss_board_content_reports.update({
    where: { id: contentReportId },
    data: {
      status: body.status ?? undefined,
      reason: body.reason ?? undefined,
      moderation_action_id: body.moderation_action_id ?? undefined,
      updated_at: now,
    },
  });
  // Step 4: Return DTO object mapping, converting all datetimes and optionals
  return {
    id: updated.id,
    reporter_member_id: updated.reporter_member_id,
    content_post_id: updated.content_post_id ?? null,
    content_comment_id: updated.content_comment_id ?? null,
    content_type: updated.content_type === "post" ? "post" : "comment",
    reason: updated.reason,
    status: updated.status,
    moderation_action_id: updated.moderation_action_id ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
