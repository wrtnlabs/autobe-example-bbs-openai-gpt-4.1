import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Fetch complete details for a single moderator account
 * (discuss_board_moderators table).
 *
 * Fetches and returns a single moderator account's complete record, using the
 * moderatorId provided in props. Gathers data from discuss_board_moderators
 * table: member_id, assignment/admin ids, status, and timestamps suitable for
 * administrative use, UI presentation, or compliance review. Only
 * administrators may access this.
 *
 * @param props - Request properties
 * @param props.administrator - The authenticated administrator making this
 *   request
 * @param props.moderatorId - Unique identifier of the moderator to fetch
 * @returns Full moderator record for the given moderatorId
 * @throws {Error} If the moderator is not found (or deleted/revoked)
 */
export async function get__discussBoard_administrator_moderators_$moderatorId(props: {
  administrator: AdministratorPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardModerator> {
  const { moderatorId } = props;
  const moderator =
    await MyGlobal.prisma.discuss_board_moderators.findUniqueOrThrow({
      where: { id: moderatorId },
      select: {
        id: true,
        member_id: true,
        assigned_by_administrator_id: true,
        assigned_at: true,
        revoked_at: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: moderator.id,
    member_id: moderator.member_id,
    assigned_by_administrator_id: moderator.assigned_by_administrator_id,
    assigned_at: toISOStringSafe(moderator.assigned_at),
    revoked_at: moderator.revoked_at
      ? toISOStringSafe(moderator.revoked_at)
      : null,
    status: moderator.status,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : null,
  };
}
