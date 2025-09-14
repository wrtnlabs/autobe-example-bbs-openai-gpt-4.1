import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAppeal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Get details of a single appeal for a moderation action (moderator/admin
 * only).
 *
 * This operation fetches the complete details of a specific appeal record from
 * discuss_board_appeals, including all business, rationale, status, notes, and
 * workflow timestamps. Only administrators may use this endpoint; access is
 * enforced via authentication.
 *
 * @param props - The endpoint input parameters
 * @param props.administrator - Authenticated administrator JWT payload
 *   (authorization is enforced upstream)
 * @param props.appealId - The unique identifier of the appeal to retrieve
 * @returns Full record of the appeal, suitable for moderation/audit review
 * @throws {Error} If the appeal does not exist in the system
 */
export async function get__discussBoard_administrator_appeals_$appealId(props: {
  administrator: AdministratorPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardAppeal> {
  const { appealId } = props;

  const appeal = await MyGlobal.prisma.discuss_board_appeals.findUniqueOrThrow({
    where: { id: appealId },
  });

  return {
    id: appeal.id,
    moderation_action_id: appeal.moderation_action_id,
    appellant_member_id: appeal.appellant_member_id,
    appeal_rationale: appeal.appeal_rationale,
    status: appeal.status,
    resolution_notes:
      appeal.resolution_notes !== undefined ? appeal.resolution_notes : null,
    created_at: toISOStringSafe(appeal.created_at),
    updated_at: toISOStringSafe(appeal.updated_at),
    deleted_at:
      appeal.deleted_at != null ? toISOStringSafe(appeal.deleted_at) : null,
  };
}
