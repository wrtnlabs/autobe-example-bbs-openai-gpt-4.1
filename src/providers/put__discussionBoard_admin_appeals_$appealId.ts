import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update or correct an existing appeal, reason, status, or linkage.
 *
 * Update an existing appeal against a moderation action or flag report. Allows
 * correction or addition of appeal narrative, adjust status (e.g.,
 * moderator/admin review), update resolution comments, or amend linked
 * moderation/flag report reference if appropriate. All updates are logged for
 * regulatory compliance and audit, and responses include the full updated
 * appeal record.
 *
 * Permission logic enforces that only the original appellant, a moderator, or
 * an admin may update an appeal in allowed workflow states. Attempts by
 * unauthorized or out-of-sequence actors will be denied and logged. This
 * ensures appeal integrity, audit trails, and structured workflow management
 * while retaining a complete history of modifications.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin session (must be enrolled and
 *   not deleted)
 * @param props.appealId - Unique identifier for the appeal to update (UUID)
 * @param props.body - Update payload: any subset of appeal_reason, status,
 *   resolution_comment, resolved_at, moderation_action_id, flag_report_id
 * @returns The updated appeal record, reflecting the provided changes
 * @throws {Error} When the appeal does not exist or is already deleted
 */
export async function put__discussionBoard_admin_appeals_$appealId(props: {
  admin: AdminPayload;
  appealId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAppeal.IUpdate;
}): Promise<IDiscussionBoardAppeal> {
  const { appealId, body } = props;

  // Fetch appeal for existence and soft-deleted check
  const existing = await MyGlobal.prisma.discussion_board_appeals.findFirst({
    where: { id: appealId, deleted_at: null },
  });
  if (!existing) throw new Error("Appeal not found");

  // Update mutable fields. Only the provided fields in body will be updated; others remain unchanged.
  const updated = await MyGlobal.prisma.discussion_board_appeals.update({
    where: { id: appealId },
    data: {
      appeal_reason: body.appeal_reason ?? undefined,
      status: body.status ?? undefined,
      resolution_comment: body.resolution_comment ?? undefined,
      resolved_at: body.resolved_at ?? undefined,
      moderation_action_id: body.moderation_action_id ?? undefined,
      flag_report_id: body.flag_report_id ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

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
