import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieves details of a single appeal by unique identifier for moderator
 * audit, tracking, and compliance.
 *
 * Returns all relevant information for the appeal—including appeal reason,
 * status, timestamps, related moderation or flag report references, and
 * moderator/admin resolution details. Only visible to authorized moderators.
 * Ensures soft-deleted appeals are hidden.
 *
 * @param props - Request properties
 * @param props.moderator - The authenticated moderator viewing the appeal
 * @param props.appealId - UUID of the appeal to retrieve
 * @returns Appeal detail record matching the provided appealId with full
 *   context
 * @throws {Error} When appeal cannot be found (does not exist or soft-deleted)
 */
export async function get__discussionBoard_moderator_appeals_$appealId(props: {
  moderator: ModeratorPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAppeal> {
  const { appealId } = props;

  const appeal = await MyGlobal.prisma.discussion_board_appeals.findFirst({
    where: {
      id: appealId,
      deleted_at: null,
    },
  });

  if (!appeal) {
    throw new Error("Appeal not found");
  }

  return {
    id: appeal.id,
    appellant_id: appeal.appellant_id,
    moderation_action_id: appeal.moderation_action_id ?? undefined,
    flag_report_id: appeal.flag_report_id ?? undefined,
    appeal_reason: appeal.appeal_reason,
    status: appeal.status,
    resolution_comment: appeal.resolution_comment ?? undefined,
    resolved_at:
      appeal.resolved_at !== null && appeal.resolved_at !== undefined
        ? toISOStringSafe(appeal.resolved_at)
        : null,
    created_at: toISOStringSafe(appeal.created_at),
    updated_at: toISOStringSafe(appeal.updated_at),
    deleted_at:
      appeal.deleted_at !== null && appeal.deleted_at !== undefined
        ? toISOStringSafe(appeal.deleted_at)
        : null,
  };
}
