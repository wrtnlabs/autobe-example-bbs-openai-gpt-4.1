import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Soft delete (retire) an appeal for compliance/audit purposes.
 *
 * Soft-deletes (retires) an appeal by setting its deleted_at timestamp. This
 * hides the appeal from normal access but preserves the record for audit and
 * compliance. Only moderators can perform this action via this endpoint,
 * enforcing authorization. Throws if the target appeal does not exist or is
 * already retired.
 *
 * @param props - Request properties
 * @param props.moderator - Authenticated moderator performing the action; must
 *   be active and valid (decorator enforced)
 * @param props.appealId - The unique ID of the appeal to soft delete
 * @returns Returns the appeal record with deletion state set, as
 *   IDiscussionBoardAppeal
 * @throws {Error} If the appeal is not found or is already soft-deleted
 */
export async function delete__discussionBoard_moderator_appeals_$appealId(props: {
  moderator: ModeratorPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAppeal> {
  const { appealId } = props;
  // Find the appeal and ensure it's not already retired
  const appeal = await MyGlobal.prisma.discussion_board_appeals.findFirst({
    where: {
      id: appealId,
      deleted_at: null,
    },
  });
  if (!appeal) {
    throw new Error("Appeal not found or already retired");
  }
  // Generate deletion timestamp as ISO 8601 string
  const now = toISOStringSafe(new Date());
  // Soft-delete: set deleted_at (and update updated_at for audit)
  const updated = await MyGlobal.prisma.discussion_board_appeals.update({
    where: { id: appealId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Return API type conformant object, all date fields as string & tags.Format<'date-time'>
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
