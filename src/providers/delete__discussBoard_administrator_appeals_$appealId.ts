import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Erase (permanently delete) an appeal record from the discuss_board_appeals
 * table by ID.
 *
 * This operation is reserved for administrators. It validates that the target
 * appeal exists and is in a deletable status (only 'pending' or 'closed'),
 * enforces business rules to prevent workflow/compliance violations, and
 * performs a hard delete on the record. All deletions are auditable: an entry
 * is created in the global audit log for compliance.
 *
 * @param props - The operation props
 * @param props.administrator - The authenticated administrator performing the
 *   action
 * @param props.appealId - The unique identifier of the appeal to delete
 * @returns Promise<void>
 * @throws {Error} If the appeal does not exist or cannot be deleted due to
 *   status
 */
export async function delete__discussBoard_administrator_appeals_$appealId(props: {
  administrator: AdministratorPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, appealId } = props;

  // Step 1: Fetch appeal record and validate existence
  const appeal = await MyGlobal.prisma.discuss_board_appeals.findUnique({
    where: { id: appealId },
  });
  if (!appeal) {
    throw new Error("Appeal not found");
  }

  // Step 2: Check business rules: deletable statuses only
  const deletableStatuses = ["pending", "closed"];
  if (!deletableStatuses.includes(appeal.status)) {
    throw new Error("Cannot delete appeal: not in deletable status");
  }

  // Step 3: Hard delete the record
  await MyGlobal.prisma.discuss_board_appeals.delete({
    where: { id: appealId },
  });

  // Step 4: Insert global audit log
  await MyGlobal.prisma.discuss_board_global_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: administrator.id,
      actor_type: "administrator",
      action_category: "appeal_delete",
      target_table: "discuss_board_appeals",
      target_id: appealId,
      event_payload: null,
      event_description: `Administrator erased appeal ${appealId} (status: ${appeal.status})`,
      created_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
}
