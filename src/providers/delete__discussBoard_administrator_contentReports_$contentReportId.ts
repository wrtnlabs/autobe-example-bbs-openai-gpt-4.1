import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Soft-delete a content report (discuss_board_content_reports table) by ID.
 *
 * This operation marks a content report as deleted by setting the deleted_at
 * field in the discuss_board_content_reports table to the current datetime (ISO
 * string). Only administrator access allows this action regardless of report
 * state. Hard deletion is never performed; deletion events are retained for
 * compliance and audit.
 *
 * Authorization is enforced by the AdministratorAuth decorator. No further
 * business checks are necessary for admins.
 *
 * @param props - Administrator: Authenticated administrator performing the
 *   deletion contentReportId: ID of the content report to be deleted
 * @returns Void
 * @throws {Error} If the content report does not exist
 */
export async function delete__discussBoard_administrator_contentReports_$contentReportId(props: {
  administrator: AdministratorPayload;
  contentReportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { contentReportId } = props;

  // Ensure the content report exists
  await MyGlobal.prisma.discuss_board_content_reports.findUniqueOrThrow({
    where: { id: contentReportId },
  });

  // Soft-delete the content report by setting deleted_at and updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  await MyGlobal.prisma.discuss_board_content_reports.update({
    where: { id: contentReportId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
