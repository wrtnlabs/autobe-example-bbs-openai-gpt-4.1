import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardAppeals } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAppeals";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update an existing appeal for a moderation action in the
 * discuss_board_appeals table.
 *
 * This operation allows the authenticated member (original appellant) to update
 * the rationale, status, or resolution notes of their submitted appeal,
 * provided the appeal is not already closed. Only the specific member who filed
 * the appeal may perform this update. Administrators must use the proper admin
 * endpoint (not implemented here) if broader permissions are required.
 *
 * The operation verifies:
 *
 * - Appeal exists for the provided appealId
 * - Appeal is not closed (status !== 'closed')
 * - The current member is the appellant (matching on
 *   discuss_board_members.user_account_id = member.id, and
 *   appellant_member_id)
 * - Only editable fields (appeal_rationale, status, resolution_notes) are
 *   modified; all others are immutable
 *
 * Each update records a new updated_at timestamp.
 *
 * @param props - Object containing the authenticated member, the appeal ID to
 *   update, and a partial appeal update payload.
 * @param props.member - The authenticated member (MemberPayload) performing the
 *   update.
 * @param props.appealId - The appeal record id (UUID) to update.
 * @param props.body - The update data (may include appeal_rationale, status, or
 *   resolution_notes)
 * @returns The updated appeal record in IDiscussBoardAppeals structure with all
 *   timestamp fields in ISO 8601 format.
 * @throws {Error} If the appeal does not exist
 * @throws {Error} If the appeal is already closed and may not be edited
 * @throws {Error} If the current member is not the appeal's owner
 */
export async function put__discussBoard_member_appeals_$appealId(props: {
  member: MemberPayload;
  appealId: string & tags.Format<"uuid">;
  body: IDiscussBoardAppeals.IUpdate;
}): Promise<IDiscussBoardAppeals> {
  const { member, appealId, body } = props;

  // 1. Find the appeal record by ID (must exist)
  const appeal = await MyGlobal.prisma.discuss_board_appeals.findUnique({
    where: { id: appealId },
  });
  if (!appeal) {
    throw new Error("Appeal not found");
  }

  // 2. Forbid editing if already closed
  if (appeal.status === "closed") {
    throw new Error("Appeal is closed and cannot be edited");
  }

  // 3. Find the active member record tied to the user_account_id (from the JWT payload)
  const memberRecord = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      user_account_id: member.id,
      deleted_at: null,
      status: "active",
    },
  });
  if (!memberRecord) {
    throw new Error("Active member record not found");
  }

  // 4. Enforce ownership: only original appellant can update
  if (appeal.appellant_member_id !== memberRecord.id) {
    throw new Error("You are not authorized to update this appeal");
  }

  // 5. Apply update: only allowed fields, keep others unchanged
  const now = toISOStringSafe(new Date());
  const updateData = {
    ...(body.appeal_rationale !== undefined
      ? { appeal_rationale: body.appeal_rationale }
      : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.resolution_notes !== undefined
      ? { resolution_notes: body.resolution_notes }
      : {}),
    updated_at: now,
  } satisfies IDiscussBoardAppeals.IUpdate & {
    updated_at: string & tags.Format<"date-time">;
  };

  const updated = await MyGlobal.prisma.discuss_board_appeals.update({
    where: { id: appealId },
    data: updateData,
  });

  return {
    id: updated.id,
    moderation_action_id: updated.moderation_action_id,
    appellant_member_id: updated.appellant_member_id,
    appeal_rationale: updated.appeal_rationale,
    status: updated.status,
    resolution_notes: updated.resolution_notes,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
