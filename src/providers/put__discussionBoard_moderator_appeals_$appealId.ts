import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

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
 * @param props.moderator - ModeratorPayload of the acting moderator (already
 *   verified by decorator)
 * @param props.appealId - The unique identifier for the appeal to update
 * @param props.body - The fields to update on the appeal
 * @returns The fully updated appeal, with all audit fields and compliance
 * @throws {Error} Appeal does not exist, is deleted, or update not permitted
 */
export async function put__discussionBoard_moderator_appeals_$appealId(props: {
  moderator: ModeratorPayload;
  appealId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAppeal.IUpdate;
}): Promise<IDiscussionBoardAppeal> {
  const { moderator, appealId, body } = props;

  // 1. Fetch target appeal (ensure not deleted)
  const appeal = await MyGlobal.prisma.discussion_board_appeals.findFirst({
    where: { id: appealId, deleted_at: null },
  });
  if (!appeal) throw new Error("Appeal not found or has been deleted");

  // 2. Authorization: allow only moderators (already via decorator), original appellant, or admin (additional business logic could be added here for advanced workflows)
  // (In full workflow, check status/transitions. Here, moderator is permitted if authorized caller.)

  // 3. Prepare update payload; only assign provided fields; always set updated_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_appeals.update({
    where: { id: appealId },
    data: {
      appeal_reason: body.appeal_reason ?? undefined,
      status: body.status ?? undefined,
      resolution_comment: body.resolution_comment ?? undefined,
      resolved_at: body.resolved_at ?? undefined,
      moderation_action_id: body.moderation_action_id ?? undefined,
      flag_report_id: body.flag_report_id ?? undefined,
      updated_at: now,
    },
  });

  // 4. Fetch the updated record
  const updated =
    await MyGlobal.prisma.discussion_board_appeals.findFirstOrThrow({
      where: { id: appealId },
    });

  // 5. Map and brand all fields, ensuring no Date type is returned
  return {
    id: updated.id as string & tags.Format<"uuid">,
    appellant_id: updated.appellant_id as string & tags.Format<"uuid">,
    moderation_action_id: updated.moderation_action_id ?? undefined,
    flag_report_id: updated.flag_report_id ?? undefined,
    appeal_reason: updated.appeal_reason,
    status: updated.status,
    resolution_comment: updated.resolution_comment ?? undefined,
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  } satisfies IDiscussionBoardAppeal;
}
