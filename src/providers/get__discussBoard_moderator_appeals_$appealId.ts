import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAppeal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Get details of a single appeal for a moderation action (moderator/admin
 * only).
 *
 * This endpoint retrieves the full details of an appeal record for a specific
 * moderation action, accessible by moderators and administrators. It returns
 * the appeal rationale, status, timestamps, optional resolution notes, and
 * metadata required for moderation workflow audit and transparency. Only
 * authorized moderators can call this, enforced by ModeratorAuth.
 *
 * @param props - Parameters including moderator auth payload, and appealId of
 *   the requested appeal
 * @param props.moderator - Authenticated moderator payload
 * @param props.appealId - UUID of the appeal to fetch
 * @returns The appeal record containing rationale, status, linkage, timestamps,
 *   and optional notes
 * @throws {Error} If the appeal does not exist or access is invalid (e.g., not
 *   authorized as moderator)
 */
export async function get__discussBoard_moderator_appeals_$appealId(props: {
  moderator: ModeratorPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardAppeal> {
  const { appealId } = props;
  const appeal = await MyGlobal.prisma.discuss_board_appeals.findUniqueOrThrow({
    where: { id: appealId },
    select: {
      id: true,
      moderation_action_id: true,
      appellant_member_id: true,
      appeal_rationale: true,
      status: true,
      resolution_notes: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  return {
    id: appeal.id,
    moderation_action_id: appeal.moderation_action_id,
    appellant_member_id: appeal.appellant_member_id,
    appeal_rationale: appeal.appeal_rationale,
    status: appeal.status,
    resolution_notes: appeal.resolution_notes ?? undefined,
    created_at: toISOStringSafe(appeal.created_at),
    updated_at: toISOStringSafe(appeal.updated_at),
    deleted_at:
      appeal.deleted_at != null
        ? toISOStringSafe(appeal.deleted_at)
        : undefined,
  };
}
