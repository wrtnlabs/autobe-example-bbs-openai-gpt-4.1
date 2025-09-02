import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Soft delete (retire) an appeal record by setting its deleted_at timestamp.
 *
 * This operation marks an appeal as deleted for audit and compliance, making it
 * inaccessible in standard queries but preserving its record. Only the appeal's
 * owner (user/appellant) may perform this operation through this endpoint;
 * forbidden for others. Attempting to delete a non-existent, already-deleted,
 * or unauthorized appeal will throw an error.
 *
 * @param props - The operation props
 *
 *   - User: Authorized user, must be the appeal owner (appellant)
 *   - AppealId: Unique id of the appeal to be soft-deleted (string &
 *       tags.Format<'uuid'>)
 *
 * @returns IDiscussionBoardAppeal - The updated appeal record including the new
 *   deleted_at timestamp
 * @throws Error - 404 if appeal does not exist or is already deleted, or
 *   forbidden if not the owner
 */
export async function delete__discussionBoard_user_appeals_$appealId(props: {
  user: UserPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAppeal> {
  const { user, appealId } = props;

  // Only allow operation for not-yet-deleted appeals
  const appeal =
    await MyGlobal.prisma.discussion_board_appeals.findFirstOrThrow({
      where: {
        id: appealId,
        deleted_at: null,
      },
    });

  // Authorization: only the appeal's owner may soft-delete
  if (appeal.appellant_id !== user.id) {
    throw new Error("Forbidden: You can only retire your own appeal.");
  }

  // Prepare ISO strings for date fields
  const now = toISOStringSafe(new Date());

  // Soft-delete: set deleted_at and updated_at
  const updated = await MyGlobal.prisma.discussion_board_appeals.update({
    where: { id: appealId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  // Return the properly formatted DTO
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
