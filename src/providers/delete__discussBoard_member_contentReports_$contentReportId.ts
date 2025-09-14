import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Soft-delete a content report (discuss_board_content_reports table) by ID.
 *
 * Deletes (soft deletes) an existing content report by marking deleted_at in
 * the discuss_board_content_reports schema. Only the reporting member may
 * perform this action before moderation review begins, or
 * moderators/administrators may remove test, abuse, or obviously invalid
 * reports. The content report remains in the system for audit, workflow, and
 * regulatory compliance.
 *
 * Business rules strictly enforce who may delete a report and under what
 * circumstances. Once moderation review has begun or a moderation action is
 * attached, deletion by the reporting member is no longer allowed. All deletion
 * actions are logged for review by compliance or platform investigators.
 *
 * @param props - Properties for the operation
 * @param props.member - The authenticated member making this request
 *   (MemberPayload)
 * @param props.contentReportId - The target content report ID to be soft
 *   deleted
 * @returns Void
 * @throws {Error} If member record is missing or not active
 * @throws {Error} If report does not exist or is already deleted
 * @throws {Error} If requestor does not own this report
 * @throws {Error} If report has already been reviewed or attached to moderation
 *   action
 */
export async function delete__discussBoard_member_contentReports_$contentReportId(props: {
  member: MemberPayload;
  contentReportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, contentReportId } = props;

  // 1. Resolve member record (to get their discuss_board_members.id for ownership check)
  const memberRecord = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      user_account_id: member.id,
      status: "active",
      deleted_at: null,
    },
  });
  if (!memberRecord) {
    throw new Error("Active member record not found for this account");
  }

  // 2. Fetch the target report only if not already soft-deleted
  const report = await MyGlobal.prisma.discuss_board_content_reports.findFirst({
    where: {
      id: contentReportId,
      deleted_at: null,
    },
  });
  if (!report) {
    throw new Error(
      "Content report does not exist or has already been deleted",
    );
  }

  // 3. Confirm reporting member is only the owner
  if (report.reporter_member_id !== memberRecord.id) {
    throw new Error("You can only delete content reports you have filed.");
  }

  // 4. Business rule: Only allow delete if not attached to moderation AND not reviewed
  //    (status must be 'pending' or 'under_review', and moderation_action_id must be null)
  const permissibleStatuses = ["pending", "under_review"];
  if (
    !permissibleStatuses.includes(report.status) ||
    report.moderation_action_id !== null
  ) {
    throw new Error(
      "Content report can only be deleted if it is pending review and not attached to moderation action.",
    );
  }

  // 5. Perform soft delete by marking deleted_at (ISO8601 string, not Date) strictly branded
  await MyGlobal.prisma.discuss_board_content_reports.update({
    where: {
      id: contentReportId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
