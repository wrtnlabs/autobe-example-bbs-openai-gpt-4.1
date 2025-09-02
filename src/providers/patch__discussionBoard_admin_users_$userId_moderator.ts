import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves the moderator role status and assignment record for a specific user
 * by userId.
 *
 * Fetches the discussion_board_moderators record for the given userId,
 * including active status, assignment, suspension window, revocation, and soft
 * deletion status. Only accessible to admins (authorization required). Returns
 * all moderator-specific metadata required for privilege verification,
 * auditing, or lifecycle checks.
 *
 * @param props - Properties for the request
 * @param props.admin - Authenticated admin payload (authorization enforced)
 * @param props.userId - The UUID of the user whose moderator record is queried
 * @param props.body - Moderator record query parameters (currently for future
 *   extension, not used)
 * @returns IDiscussionBoardModerator object describing moderator privileges and
 *   lifecycle metadata
 * @throws {Error} If the moderator record does not exist for given userId, or
 *   soft deleted
 */
export async function patch__discussionBoard_admin_users_$userId_moderator(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerator.IRequest;
}): Promise<IDiscussionBoardModerator> {
  const { userId } = props;
  const moderator =
    await MyGlobal.prisma.discussion_board_moderators.findFirstOrThrow({
      where: {
        user_id: userId,
        deleted_at: null,
      },
    });
  return {
    id: moderator.id,
    user_id: moderator.user_id,
    assigned_at: toISOStringSafe(moderator.assigned_at),
    revoked_at: moderator.revoked_at
      ? toISOStringSafe(moderator.revoked_at)
      : null,
    is_active: moderator.is_active,
    suspended_until: moderator.suspended_until
      ? toISOStringSafe(moderator.suspended_until)
      : null,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : null,
  };
}
