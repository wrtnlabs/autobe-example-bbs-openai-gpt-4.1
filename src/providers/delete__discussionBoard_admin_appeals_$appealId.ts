import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete (retire) an appeal for compliance/audit purposes.
 *
 * Soft delete (retire) an appeal record. This marks the appeal as deleted (sets
 * deleted_at), rendering it inaccessible in public queries but maintaining the
 * record for audit/compliance. Permission logic enforces that only the
 * appellant, moderators, or admins may retire appeals, and only in allowed
 * workflow states (e.g., after closure/resolution or where personal data rights
 * permit). Attempts to retire ineligible appeals are denied and logged for
 * transparency.
 *
 * Soft-deletion is audit-safe, preserves data for regulatory and compliance
 * checks, and cannot be reversed without admin intervention. The API provides
 * confirmation and updated record of retirement state.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin attempting the soft delete
 * @param props.appealId - Unique ID of the appeal to soft delete
 * @returns The updated (soft-deleted) appeal record, with all fields mapped and
 *   date values as ISO strings
 * @throws {Error} If the appeal does not exist
 */
export async function delete__discussionBoard_admin_appeals_$appealId(props: {
  admin: AdminPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAppeal> {
  const { admin, appealId } = props;
  // Lookup the appeal; throw if not found
  const found = await MyGlobal.prisma.discussion_board_appeals.findUnique({
    where: { id: appealId },
  });
  if (!found) {
    throw new Error("Appeal not found");
  }

  // Soft delete by setting deleted_at (ISO string)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_appeals.update({
    where: { id: appealId },
    data: { deleted_at: now },
  });

  // Map date properties with type safety and branding
  return {
    id: updated.id,
    appellant_id: updated.appellant_id,
    moderation_action_id: updated.moderation_action_id ?? null,
    flag_report_id: updated.flag_report_id ?? null,
    appeal_reason: updated.appeal_reason,
    status: updated.status,
    resolution_comment: updated.resolution_comment ?? null,
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
