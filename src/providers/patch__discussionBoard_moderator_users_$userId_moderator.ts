import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieves the moderator record (status, assignment, and metadata) for a
 * specific user.
 *
 * This endpoint is accessible only to authenticated moderators/admins and
 * returns the discussion_board_moderators record for the provided userId. It
 * includes status, lifecycle timestamps, suspension/revocation metadata, and
 * soft deletion state.
 *
 * @param props - Request properties
 * @param props.moderator - Authenticated moderator making the request (must
 *   have privileges)
 * @param props.userId - The userId whose moderator status/assignment is to be
 *   fetched
 * @param props.body - Moderator query parameters (currently ignored; for future
 *   use)
 * @returns The moderator assignment/privilege record for given userId,
 *   including all moderator-specific metadata
 * @throws {Error} If no active moderator record is found for the user
 */
export async function patch__discussionBoard_moderator_users_$userId_moderator(props: {
  moderator: ModeratorPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardModerator.IRequest;
}): Promise<IDiscussionBoardModerator> {
  const { moderator, userId } = props;
  const record = await MyGlobal.prisma.discussion_board_moderators.findFirst({
    where: {
      user_id: userId,
      deleted_at: null,
    },
  });
  if (!record) {
    throw new Error("Moderator record not found for this user");
  }
  return {
    id: record.id,
    user_id: record.user_id,
    assigned_at: toISOStringSafe(record.assigned_at),
    revoked_at: record.revoked_at ? toISOStringSafe(record.revoked_at) : null,
    is_active: record.is_active,
    suspended_until: record.suspended_until
      ? toISOStringSafe(record.suspended_until)
      : null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
