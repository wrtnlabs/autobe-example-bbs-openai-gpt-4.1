import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardAppeals } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAppeals";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update an existing appeal for a moderation action in the
 * discuss_board_appeals table.
 *
 * This operation allows administrators to update an appeal's rationale, status,
 * or resolution notes. It verifies that the appeal exists, is not soft-deleted,
 * and is not in a terminal state (closed, accepted, denied). Only
 * appeal_rationale, status, and resolution_notes may be updated. The updated_at
 * timestamp is always refreshed. All date fields are returned as ISO strings.
 *
 * @param props - Parameters for the operation
 * @param props.administrator - Authenticated administrator performing the
 *   update
 * @param props.appealId - UUID of the appeal to update
 * @param props.body - Fields to update: rationale, status, or resolution notes
 * @returns The updated appeal record
 * @throws {Error} If the appeal is not found, is deleted, or cannot be updated
 *   due to its workflow status
 */
export async function put__discussBoard_administrator_appeals_$appealId(props: {
  administrator: AdministratorPayload;
  appealId: string & tags.Format<"uuid">;
  body: IDiscussBoardAppeals.IUpdate;
}): Promise<IDiscussBoardAppeals> {
  const { administrator, appealId, body } = props;
  const appeal = await MyGlobal.prisma.discuss_board_appeals.findUnique({
    where: { id: appealId },
  });
  if (!appeal) {
    throw new Error("Appeal not found");
  }
  if (appeal.deleted_at !== null) {
    throw new Error("Cannot update a deleted appeal");
  }
  if (["closed", "denied", "accepted"].includes(appeal.status)) {
    throw new Error(
      "Cannot update a finalized appeal (closed, denied, or accepted)",
    );
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discuss_board_appeals.update({
    where: { id: appealId },
    data: {
      appeal_rationale: body.appeal_rationale ?? undefined,
      status: body.status ?? undefined,
      resolution_notes: body.resolution_notes ?? undefined,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    moderation_action_id: updated.moderation_action_id,
    appellant_member_id: updated.appellant_member_id,
    appeal_rationale: updated.appeal_rationale,
    status: updated.status,
    resolution_notes: updated.resolution_notes ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
